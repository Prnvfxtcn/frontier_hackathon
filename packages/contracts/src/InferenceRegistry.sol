// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ConsentRegistry} from "./ConsentRegistry.sol";
import {Settlement} from "./Settlement.sol";

contract InferenceRegistry {
    struct Receipt {
        bytes32 consentId;
        address provider;
        bytes32 patientRef;
        bytes32 inputHash;
        bytes32 outputHash;
        bytes32 promptHash;
        bytes32 merkleRoot;
        string modelId;
        bytes32 modelVersion;
        uint16 coherenceScore;
        uint64 timestamp;
        bool paid;
        string secondModelId;
        bytes32 secondModelVersion;
        bytes32 secondOutputHash;
        uint16 agreementScore;
    }

    ConsentRegistry public immutable consentRegistry;
    Settlement public immutable settlement;
    bytes32 public scopeHash;
    uint16 public constant MIN_SCORE = 80;
    uint16 public constant MIN_AGREEMENT = 80;

    mapping(bytes32 => Receipt) public receipts;

    event InferenceRecorded(
        bytes32 indexed receiptId,
        bytes32 indexed consentId,
        address indexed provider,
        bytes32 patientRef,
        uint16 coherenceScore,
        uint64 timestamp,
        uint16 agreementScore,
        string secondModelId
    );

    error InvalidConsent();
    error ScoreTooLow();
    error AgreementTooLow();
    error AlreadyPaid();
    error ReceiptNotFound();

    constructor(address _consentRegistry, address _settlement, bytes32 _scopeHash) {
        consentRegistry = ConsentRegistry(_consentRegistry);
        settlement = Settlement(_settlement);
        scopeHash = _scopeHash;
    }

    function recordInference(Receipt calldata r) external returns (bytes32 receiptId) {
        if (!consentRegistry.isConsentValid(r.consentId, msg.sender, scopeHash)) {
            revert InvalidConsent();
        }
        if (r.coherenceScore < MIN_SCORE) revert ScoreTooLow();
        if (r.agreementScore > 0 && r.agreementScore < MIN_AGREEMENT) revert AgreementTooLow();
        if (r.paid) revert AlreadyPaid();

        ConsentRegistry.ConsentGrant memory grant = consentRegistry.getConsent(r.consentId);
        bytes32 patientRef = keccak256(abi.encodePacked(grant.patient));

        uint64 timestamp = uint64(block.timestamp);
        receiptId = keccak256(abi.encode(r.consentId, r.inputHash, r.outputHash, timestamp));

        settlement.collect(msg.sender, receiptId);

        receipts[receiptId] = Receipt({
            consentId: r.consentId,
            provider: msg.sender,
            patientRef: patientRef,
            inputHash: r.inputHash,
            outputHash: r.outputHash,
            promptHash: r.promptHash,
            merkleRoot: r.merkleRoot,
            modelId: r.modelId,
            modelVersion: r.modelVersion,
            coherenceScore: r.coherenceScore,
            timestamp: timestamp,
            paid: true,
            secondModelId: r.secondModelId,
            secondModelVersion: r.secondModelVersion,
            secondOutputHash: r.secondOutputHash,
            agreementScore: r.agreementScore
        });

        emit InferenceRecorded(
            receiptId,
            r.consentId,
            msg.sender,
            r.patientRef,
            r.coherenceScore,
            timestamp,
            r.agreementScore,
            r.secondModelId
        );
    }

    function getReceipt(bytes32 id) external view returns (Receipt memory) {
        return receipts[id];
    }

    function verifyReceipt(bytes32 id, bytes32 inputHash, bytes32 outputHash) external view returns (bool) {
        Receipt storage r = receipts[id];
        if (r.timestamp == 0) return false;
        return r.inputHash == inputHash && r.outputHash == outputHash && r.paid;
    }

    function verifyEnsembleReceipt(
        bytes32 id,
        bytes32 inputHash,
        bytes32 outputHash,
        bytes32 secondOutputHash
    ) external view returns (bool) {
        Receipt storage r = receipts[id];
        if (r.timestamp == 0) return false;
        if (r.agreementScore == 0) return false;
        return r.inputHash == inputHash && r.outputHash == outputHash && r.secondOutputHash == secondOutputHash
            && r.agreementScore >= MIN_AGREEMENT && r.paid;
    }
}
