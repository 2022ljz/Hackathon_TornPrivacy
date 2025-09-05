const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') })
const { ethers } = require('ethers')

async function main() {
  const root = path.resolve(__dirname, '..', '..')
  const addressesPath = path.join(root, 'addresses.json')
  if (!fs.existsSync(addressesPath)) {
    console.error('addresses.json not found at', addressesPath)
    process.exit(1)
  }
  const addrs = JSON.parse(fs.readFileSync(addressesPath, 'utf8'))

  const RPC = process.env.RPC || process.env.ALCHEMY_RPC || process.env.ETH_RPC
  const PK = process.env.PRIVATE_KEY
  if (!RPC || !PK) {
    console.error('Please set RPC and PRIVATE_KEY in backend-sepolia/.env or environment')
    process.exit(1)
  }

  const provider = new ethers.JsonRpcProvider(RPC)
  const signer = new ethers.Wallet(PK, provider)

  const mixerAddr = addrs.mixer
  const daiAddr = addrs.dai
  if (!mixerAddr || !daiAddr) {
    console.error('mixer or dai address missing in addresses.json')
    process.exit(1)
  }

  // Minimal ABIs
  const erc20 = [
    'function approve(address spender,uint256 amount) public returns (bool)',
    'function decimals() view returns (uint8)',
    'event Transfer(address indexed from,address indexed to,uint256 value)'
  ]
  const mixerAbi = [
    'function deposit(bytes32 commitment,address token,uint256 amount)',
    'function getDeposit(bytes32) view returns (address,uint256,bool,bool)',
    'event Deposit(bytes32 indexed commitment,address token,uint256 amount)'
  ]

  const token = new ethers.Contract(daiAddr, erc20, signer)
  const mixer = new ethers.Contract(mixerAddr, mixerAbi, signer)

  // Build a random note and commitment
  const noteBytes = ethers.randomBytes(32)
  const note = '0x' + Buffer.from(noteBytes).toString('hex')
  const commitment = ethers.keccak256(ethers.toUtf8Bytes(note))

  const decimals = await token.decimals().catch(() => 18)
  const amountHuman = '0.01'
  const amount = ethers.parseUnits(amountHuman, decimals)

  console.log('Using signer:', await signer.getAddress())
  console.log('Note:', note)
  console.log('Commitment:', commitment)
  console.log('Approving token to mixer...')
  const tx1 = await token.approve(mixerAddr, amount)
  console.log('Approve tx hash', tx1.hash)
  await tx1.wait()

  console.log('Calling mixer.deposit...')
  const tx2 = await mixer.deposit(commitment, daiAddr, amount)
  console.log('Deposit tx hash', tx2.hash)
  const receipt = await tx2.wait()
  console.log('Deposit tx mined in block', receipt.blockNumber)

  // Try to parse Deposit event
  const depositEvents = receipt.logs
    .map((log) => {
      try {
        return mixer.interface.parseLog(log)
      } catch (e) {
        return null
      }
    })
    .filter(Boolean)

  console.log('Decoded mixer events from receipt:')
  depositEvents.forEach(ev => console.log(ev.name, ev.args))

  // Read on-chain deposit record
  const dep = await mixer.getDeposit(commitment)
  console.log('on-chain getDeposit(commitment) =>', {
    token: dep[0],
    amount: dep[1].toString(),
    withdrawn: dep[2],
    locked: dep[3]
  })

  console.log('Done')
}

main().catch(err => { console.error(err); process.exitCode = 1 })
