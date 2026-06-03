// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface ISettlement {
    function collect(address payer, bytes32 receiptId) external;
    function price() external view returns (uint256);
}

contract Settlement is ISettlement {
    IERC20 public immutable usdc;
    address public immutable treasury;
    address public inferenceRegistry;
    uint256 public price;

    event PaymentSettled(bytes32 indexed receiptId, address indexed provider, uint256 amount, uint256 timestamp);
    event PriceUpdated(uint256 newPrice);

    error OnlyInferenceRegistry();
    error ZeroAddress();

    modifier onlyInferenceRegistry() {
        if (msg.sender != inferenceRegistry) revert OnlyInferenceRegistry();
        _;
    }

    constructor(address _usdc, address _treasury, uint256 _price) {
        if (_usdc == address(0) || _treasury == address(0)) revert ZeroAddress();
        usdc = IERC20(_usdc);
        treasury = _treasury;
        price = _price;
    }

    function setInferenceRegistry(address _registry) external {
        if (inferenceRegistry != address(0)) revert OnlyInferenceRegistry();
        inferenceRegistry = _registry;
    }

    function setPrice(uint256 _price) external {
        price = _price;
        emit PriceUpdated(_price);
    }

    function collect(address payer, bytes32 receiptId) external onlyInferenceRegistry {
        usdc.transferFrom(payer, treasury, price);
        emit PaymentSettled(receiptId, payer, price, block.timestamp);
    }
}
