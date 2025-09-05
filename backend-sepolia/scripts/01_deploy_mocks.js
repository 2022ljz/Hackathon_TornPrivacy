const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying mocks with:", deployer.address);

  const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
  // USDC-like (6 decimals)
  const usdc = await ERC20Mock.deploy("USDC Test", "USDC", 6);
  await usdc.waitForDeployment();
  console.log("USDC deployed:", await usdc.getAddress());
  // mint 1,000,000 * 10^6
  await (await usdc.mint(deployer.address, ethers.parseUnits("1000000", 6))).wait();
  console.log("USDC minted to deployer");

  // DAI-like (18 decimals)
  const dai = await ERC20Mock.deploy("DAI Test", "DAI", 18);
  await dai.waitForDeployment();
  console.log("DAI deployed:", await dai.getAddress());
  await (await dai.mint(deployer.address, ethers.parseUnits("1000000", 18))).wait();
  console.log("DAI minted to deployer");

  console.log(`\nUSDC=${await usdc.getAddress()}\nDAI=${await dai.getAddress()}\n`);
}

main().catch((err) => { console.error(err); process.exitCode = 1; });
