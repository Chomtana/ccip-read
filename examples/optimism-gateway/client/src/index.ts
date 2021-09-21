const ethers = require('ethers');
const namehash = require('eth-ens-namehash');
const TEST_NODE = namehash.hash('test.test');
const TEST2_NODE = namehash.hash('test2.test');
const nodeFetch = require('node-fetch');
const TEST_ADDRESS = "0x0000000000000000000000000000000000000001";

require('dotenv').config({ path: '../contracts/.env' });
const fs = require('fs');
const abi = JSON.parse(
  fs.readFileSync(
    '../server/abis/OptimismResolverStub.json',
    'utf8'
  )
);
const abi2 = JSON.parse(
  fs.readFileSync(
    '../server/abis/OptimismResolver.json',
    'utf8'
  )
);
const {
  RESOLVER_ADDRESS,
  RESOLVER_STUB_ADDRESS
} = process.env;
const PROVIDER_URL = 'http://localhost:9545'
const provider = new ethers.providers.JsonRpcProvider(PROVIDER_URL);
const L2_PROVIDER_URL = 'http://localhost:8545'
const l2provider = new ethers.providers.JsonRpcProvider(L2_PROVIDER_URL);
const resolver = new ethers.Contract(RESOLVER_STUB_ADDRESS, abi, provider);

console.log({
  RESOLVER_STUB_ADDRESS
})

function createL2Wallet() {
  const mnemonic = "test test test test test test test test test test test junk";
  const mnemonicWallet = ethers.Wallet.fromMnemonic(mnemonic);
  return new ethers.Wallet(mnemonicWallet.privateKey, l2provider)
}

function sleep(ms:number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
async function addr(node: string) {
  try {
    return await resolver.addr(node);
  } catch (e) {
    console.log(`*** resolver.addr error: ${e.message}`);
    if (true) {
      // Hardcode the url until https://github.com/nomiclabs/hardhat/issues/1882 is solved
      const url = 'http://localhost:8081/rpc';
      const iface = new ethers.utils.Interface(abi);
      const data = iface.encodeFunctionData('addr', [node]);
      const body = {
        jsonrpc: '2.0',
        method: 'durin_call',
        params: [{ to: RESOLVER_STUB_ADDRESS, data }],
        id: 1,
      };
      const result = await (
        await nodeFetch(url, {
          method: 'post',
          body: JSON.stringify(body),
          headers: { 'Content-Type': 'application/json' },
        })
      ).json();
      try{
        const outputdata = await provider.call({
          to: RESOLVER_STUB_ADDRESS,
          data: result && result.result,
        });
        return iface.decodeFunctionResult('addrWithProof', outputdata);  
      }catch(ee){
        console.log(`*** resolver.addrWithProof error: ${ee.message}`);
      }
    } else {
      console.log(e);
    }
  }
}

async function main() {
  console.log('Ask durin for test.test');
  console.log(await addr(TEST_NODE));
  console.log('Ask durin for test2.test');
  console.log(await addr(TEST2_NODE));
  const l2resolver = new ethers.Contract(RESOLVER_ADDRESS, abi2, createL2Wallet());
  console.log('Update test.test on l2');
  await (await l2resolver.setAddr(TEST_NODE, TEST_ADDRESS)).wait();
  console.log('Set new value to l2', await l2resolver.addr(TEST_NODE));
  console.log('Wait 10 sec');
  await sleep(10000)
  console.log('Ask durin again');
  console.log(await addr(TEST_NODE));
}

main();