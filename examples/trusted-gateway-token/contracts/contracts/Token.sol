//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Token
 * @dev Very simple ERC20 Token example, where all tokens are pre-assigned to the creator.
 * Note they can later distribute these tokens as they wish using `transfer` and other
 * `ERC20` functions.
 * Based on https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v2.5.1/contracts/examples/SimpleToken.sol
 */
contract Token is ERC20, Ownable {
  string public url;
  address private _signer;
  mapping(address=>bool) claimed;
  error OffchainLookup(string url, bytes prefix);
  struct BalanceProof {
    bytes signature;
    uint balance;
  }

  /**
    * @dev Constructor that gives msg.sender all of existing tokens.
    */
  constructor(
      string memory name,
      string memory symbol,
      uint256 initialSupply
  ) ERC20(name, symbol) {
      _mint(msg.sender, initialSupply);
  }

  function setUrl(string memory url_) external onlyOwner{
    url = url_;
  }

  function setSigner(address signer_) external onlyOwner{
    _signer = signer_;
  }

  function getSigner() external view returns(address){
    return _signer;
  }

  function balanceOf(address addr) public override view returns(uint balance) {
    if(claimed[addr]){
      return super.balanceOf(addr);
    }else{
      revert OffchainLookup(url, abi.encodeWithSelector(Token.balanceOfWithProof.selector, addr));
    }
  }

  function balanceOfWithProof(address addr, BalanceProof memory proof) external view returns(uint) {
    address recovered = recoverAddress(
      keccak256(abi.encodePacked(proof.balance, addr)),
      proof.signature
    );
    require(_signer == recovered, "Signer is not the domain owner");
    return proof.balance;
  }

  function recoverAddress(bytes32 messageHash, bytes memory signature) internal pure returns(address) {
    (uint8 v, bytes32 r, bytes32 s) = splitSignature(signature);
    bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
    return ecrecover(ethSignedMessageHash, v, r, s);
  }

  /// signature methods.
  function splitSignature(bytes memory sig)
      internal
      pure
      returns (uint8 v, bytes32 r, bytes32 s)
  {
      require(sig.length == 65);
      assembly {
          // first 32 bytes, after the length prefix.
          r := mload(add(sig, 32))
          // second 32 bytes.
          s := mload(add(sig, 64))
          // final byte (first byte of the next 32 bytes).
          v := byte(0, mload(add(sig, 96)))
      }
      return (v, r, s);
  }
}