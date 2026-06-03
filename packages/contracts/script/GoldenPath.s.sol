// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {ConsentRegistry} from "../src/ConsentRegistry.sol";
import {InferenceRegistry} from "../src/InferenceRegistry.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {Settlement} from "../src/Settlement.sol";

contract GoldenPath is Script {
    function run() external {
        uint256 patientKey = vm.envUint("PATIENT_PRIVATE_KEY");
        uint256 providerKey = vm.envUint("PROVIDER_PRIVATE_KEY");
        address provider = vm.addr(providerKey);
        address patient = vm.addr(patientKey);

        bytes32 scopeHash = keccak256(bytes("allergies,diagnosis,dob,followUp,medications,patientName"));

        vm.startBroadcast(patientKey);
        bytes32 consentId = ConsentRegistry(vm.envAddress("CONSENT_REGISTRY")).grantConsent(
            provider, scopeHash, 0, uint64(block.timestamp + 1 days)
        );
        vm.stopBroadcast();
        console2.log("Consent ID:", vm.toString(consentId));

        InferenceRegistry.Receipt memory r = InferenceRegistry.Receipt({
            consentId: consentId,
            provider: provider,
            patientRef: keccak256(abi.encodePacked(patient)),
            inputHash: vm.envBytes32("INPUT_HASH"),
            outputHash: vm.envBytes32("OUTPUT_HASH"),
            promptHash: vm.envBytes32("PROMPT_HASH"),
            merkleRoot: vm.envBytes32("MERKLE_ROOT"),
            modelId: "mock-extractor",
            modelVersion: vm.envBytes32("MODEL_VERSION"),
            coherenceScore: uint16(vm.envUint("COHERENCE_SCORE")),
            timestamp: 0,
            paid: false
        });

        address usdc = vm.envAddress("MOCK_USDC");
        address settlement = vm.envAddress("SETTLEMENT");
        address registry = vm.envAddress("INFERENCE_REGISTRY");

        vm.startBroadcast(providerKey);
        MockUSDC(usdc).mint(provider, 10_000_000);
        MockUSDC(usdc).approve(settlement, Settlement(settlement).price());
        bytes32 receiptId = InferenceRegistry(registry).recordInference(r);
        vm.stopBroadcast();

        console2.log("Receipt ID:", vm.toString(receiptId));
        console2.log("verifyReceipt (genuine):", InferenceRegistry(registry).verifyReceipt(receiptId, r.inputHash, r.outputHash));
        console2.log("verifyReceipt (tampered):", InferenceRegistry(registry).verifyReceipt(receiptId, keccak256("TAMPERED"), r.outputHash));
    }
}
