// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ConsentRegistry {
    enum Purpose {
        TREATMENT,
        BILLING,
        RESEARCH
    }

    struct ConsentGrant {
        address patient;
        address provider;
        bytes32 scopeHash;
        uint8 purpose;
        uint64 issuedAt;
        uint64 expiresAt;
        bool revoked;
    }

    mapping(bytes32 => ConsentGrant) public consents;

    event ConsentGranted(
        bytes32 indexed consentId,
        address indexed patient,
        address indexed provider,
        bytes32 scopeHash,
        uint64 expiresAt
    );
    event ConsentRevoked(bytes32 indexed consentId);

    error InvalidConsent();
    error NotPatient();
    error ZeroAddress();

    function grantConsent(
        address provider,
        bytes32 scopeHash,
        uint8 purpose,
        uint64 expiresAt
    ) external returns (bytes32 consentId) {
        if (provider == address(0)) revert ZeroAddress();
        if (expiresAt <= block.timestamp) revert InvalidConsent();

        uint64 issuedAt = uint64(block.timestamp);
        consentId = keccak256(abi.encode(msg.sender, provider, scopeHash, issuedAt));

        consents[consentId] = ConsentGrant({
            patient: msg.sender,
            provider: provider,
            scopeHash: scopeHash,
            purpose: purpose,
            issuedAt: issuedAt,
            expiresAt: expiresAt,
            revoked: false
        });

        emit ConsentGranted(consentId, msg.sender, provider, scopeHash, expiresAt);
    }

    function revokeConsent(bytes32 consentId) external {
        ConsentGrant storage grant = consents[consentId];
        if (grant.patient == address(0)) revert InvalidConsent();
        if (grant.patient != msg.sender) revert NotPatient();
        grant.revoked = true;
        emit ConsentRevoked(consentId);
    }

    function isConsentValid(bytes32 consentId, address provider, bytes32 scopeHash) external view returns (bool) {
        ConsentGrant storage grant = consents[consentId];
        if (grant.patient == address(0)) return false;
        if (grant.revoked) return false;
        if (block.timestamp > grant.expiresAt) return false;
        if (grant.provider != provider) return false;
        if (grant.scopeHash != scopeHash) return false;
        return true;
    }

    function getConsent(bytes32 consentId) external view returns (ConsentGrant memory) {
        return consents[consentId];
    }
}
