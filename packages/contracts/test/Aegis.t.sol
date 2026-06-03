// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {Settlement} from "../src/Settlement.sol";
import {ConsentRegistry} from "../src/ConsentRegistry.sol";
import {InferenceRegistry} from "../src/InferenceRegistry.sol";

contract AegisTest is Test {
    MockUSDC usdc;
    Settlement settlement;
    ConsentRegistry consentRegistry;
    InferenceRegistry inferenceRegistry;

    address patient = address(0x1);
    address provider = address(0x2);
    address treasury = address(0x3);
    bytes32 scopeHash = keccak256("diagnosis,medications");

    function setUp() public {
        usdc = new MockUSDC();
        settlement = new Settlement(address(usdc), treasury, 1_000_000);
        consentRegistry = new ConsentRegistry();
        inferenceRegistry = new InferenceRegistry(address(consentRegistry), address(settlement), scopeHash);
        settlement.setInferenceRegistry(address(inferenceRegistry));

        usdc.mint(provider, 10_000_000);
    }

    function _emptyEnsemble() internal pure returns (string memory, bytes32, bytes32, uint16) {
        return ("", bytes32(0), bytes32(0), uint16(0));
    }

    function _makeReceipt(bytes32 consentId, uint16 score, uint16 agreement)
        internal
        view
        returns (InferenceRegistry.Receipt memory r)
    {
        (string memory secondModel, bytes32 secondVersion, bytes32 secondOut, uint16 agree) =
            agreement > 0 ? ("qwen2.5:7b", keccak256("qwen-v"), keccak256("output-b"), agreement) : _emptyEnsemble();

        r = InferenceRegistry.Receipt({
            consentId: consentId,
            provider: provider,
            patientRef: keccak256("patient-ref"),
            inputHash: keccak256("input"),
            outputHash: keccak256("output"),
            promptHash: keccak256("prompt"),
            merkleRoot: keccak256("merkle"),
            modelId: "llama3.1:8b",
            modelVersion: keccak256("model-version"),
            coherenceScore: score,
            timestamp: 0,
            paid: false,
            secondModelId: secondModel,
            secondModelVersion: secondVersion,
            secondOutputHash: secondOut,
            agreementScore: agree
        });
    }

    function testGrantAndValidateConsent() public {
        vm.startPrank(patient);
        bytes32 consentId = consentRegistry.grantConsent(provider, scopeHash, 0, uint64(block.timestamp + 1 days));
        vm.stopPrank();

        assertTrue(consentRegistry.isConsentValid(consentId, provider, scopeHash));
    }

    function testRevokeInvalidatesConsent() public {
        vm.startPrank(patient);
        bytes32 consentId = consentRegistry.grantConsent(provider, scopeHash, 0, uint64(block.timestamp + 1 days));
        consentRegistry.revokeConsent(consentId);
        vm.stopPrank();

        assertFalse(consentRegistry.isConsentValid(consentId, provider, scopeHash));
    }

    function testRecordInferenceHappyPath() public {
        bytes32 consentId = _grantConsent();

        vm.startPrank(provider);
        usdc.approve(address(settlement), 1_000_000);

        InferenceRegistry.Receipt memory r = _makeReceipt(consentId, 94, 0);

        bytes32 receiptId = inferenceRegistry.recordInference(r);
        vm.stopPrank();

        InferenceRegistry.Receipt memory stored = inferenceRegistry.getReceipt(receiptId);
        assertTrue(stored.paid);
        assertEq(stored.coherenceScore, 94);
        assertTrue(inferenceRegistry.verifyReceipt(receiptId, r.inputHash, r.outputHash));
        assertEq(usdc.balanceOf(treasury), 1_000_000);
    }

    function testEnsembleHappyPath() public {
        bytes32 consentId = _grantConsent();

        vm.startPrank(provider);
        usdc.approve(address(settlement), 1_000_000);

        InferenceRegistry.Receipt memory r = _makeReceipt(consentId, 92, 96);

        bytes32 receiptId = inferenceRegistry.recordInference(r);
        vm.stopPrank();

        InferenceRegistry.Receipt memory stored = inferenceRegistry.getReceipt(receiptId);
        assertEq(stored.agreementScore, 96);
        assertEq(stored.secondModelId, "qwen2.5:7b");
        assertTrue(
            inferenceRegistry.verifyEnsembleReceipt(receiptId, r.inputHash, r.outputHash, r.secondOutputHash)
        );
    }

    function testEnsembleRevertsOnLowAgreement() public {
        bytes32 consentId = _grantConsent();

        vm.startPrank(provider);
        usdc.approve(address(settlement), 1_000_000);

        InferenceRegistry.Receipt memory r = _makeReceipt(consentId, 92, 50);

        vm.expectRevert(InferenceRegistry.AgreementTooLow.selector);
        inferenceRegistry.recordInference(r);
        vm.stopPrank();
    }

    function testRecordInferenceRevertsOnInvalidConsent() public {
        vm.startPrank(provider);
        usdc.approve(address(settlement), 1_000_000);

        InferenceRegistry.Receipt memory r = _makeReceipt(keccak256("missing"), 94, 0);

        vm.expectRevert(InferenceRegistry.InvalidConsent.selector);
        inferenceRegistry.recordInference(r);
        vm.stopPrank();
    }

    function testRecordInferenceRevertsOnLowScore() public {
        bytes32 consentId = _grantConsent();

        vm.startPrank(provider);
        usdc.approve(address(settlement), 1_000_000);

        InferenceRegistry.Receipt memory r = _makeReceipt(consentId, 50, 0);

        vm.expectRevert(InferenceRegistry.ScoreTooLow.selector);
        inferenceRegistry.recordInference(r);
        vm.stopPrank();
    }

    function testVerifyReceiptFailsOnTamperedHash() public {
        bytes32 consentId = _grantConsent();

        vm.startPrank(provider);
        usdc.approve(address(settlement), 1_000_000);

        InferenceRegistry.Receipt memory r = _makeReceipt(consentId, 90, 0);

        bytes32 receiptId = inferenceRegistry.recordInference(r);
        vm.stopPrank();

        assertFalse(inferenceRegistry.verifyReceipt(receiptId, keccak256("tampered"), r.outputHash));
    }

    function testPatientRefDerivedFromConsent() public {
        bytes32 consentId = _grantConsent();

        vm.startPrank(provider);
        usdc.approve(address(settlement), 1_000_000);

        InferenceRegistry.Receipt memory r = _makeReceipt(consentId, 94, 0);

        bytes32 receiptId = inferenceRegistry.recordInference(r);
        vm.stopPrank();

        InferenceRegistry.Receipt memory stored = inferenceRegistry.getReceipt(receiptId);
        assertEq(stored.patientRef, keccak256(abi.encodePacked(patient)));
        assertTrue(stored.patientRef != keccak256(abi.encodePacked(provider)));
    }

    function _grantConsent() internal returns (bytes32 consentId) {
        vm.startPrank(patient);
        consentId = consentRegistry.grantConsent(provider, scopeHash, 0, uint64(block.timestamp + 1 days));
        vm.stopPrank();
    }
}
