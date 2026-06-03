// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {Settlement} from "../src/Settlement.sol";
import {ConsentRegistry} from "../src/ConsentRegistry.sol";
import {InferenceRegistry} from "../src/InferenceRegistry.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        bytes32 scopeHash = keccak256(bytes("allergies,diagnosis,dob,followUp,medications,patientName"));

        vm.startBroadcast(deployerPrivateKey);

        MockUSDC usdc = new MockUSDC();
        Settlement settlement = new Settlement(address(usdc), msg.sender, 1_000_000);
        ConsentRegistry consentRegistry = new ConsentRegistry();
        InferenceRegistry inferenceRegistry =
            new InferenceRegistry(address(consentRegistry), address(settlement), scopeHash);
        settlement.setInferenceRegistry(address(inferenceRegistry));

        vm.stopBroadcast();

        console2.log("MockUSDC:", address(usdc));
        console2.log("Settlement:", address(settlement));
        console2.log("ConsentRegistry:", address(consentRegistry));
        console2.log("InferenceRegistry:", address(inferenceRegistry));
    }
}
