const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying core with:", deployer.address);

  const Mixer = await ethers.getContractFactory("Mixer");
  const mixer = await Mixer.deploy();
  await mixer.waitForDeployment();
  console.log("mixer:", await mixer.getAddress());

  const LendingPool = await ethers.getContractFactory("LendingPool");
  const pool = await LendingPool.deploy();
  await pool.waitForDeployment();
  console.log("pool :", await pool.getAddress());

  const CollateralManager = await ethers.getContractFactory("CollateralManager");
  const mixerAddr = await mixer.getAddress();
  const poolAddr = await pool.getAddress();
  const cm = await CollateralManager.deploy(mixerAddr, poolAddr);
  await cm.waitForDeployment();
  console.log("cm   :", await cm.getAddress());

  console.log(`\nMIXER=${await mixer.getAddress()}\nPOOL=${await pool.getAddress()}\nCM=${await cm.getAddress()}\n`);
}

main().catch((err) => { console.error(err); process.exitCode = 1; });
