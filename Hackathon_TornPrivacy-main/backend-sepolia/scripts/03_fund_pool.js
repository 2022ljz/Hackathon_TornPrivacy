const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const TOKEN = process.env.TOKEN || process.env.token || "";
  const AMT = process.env.AMT || process.env.amt || "0";
  const POOL = process.env.POOL || process.env.pool || "";
  if (!TOKEN || !POOL || !AMT) {
    console.error("Usage: set TOKEN, AMT, POOL in env or pass via cross-env");
    process.exit(1);
  }

  console.log("Funding pool", POOL, "with", AMT, "of", TOKEN);
  const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
  const token = ERC20Mock.attach(TOKEN);
  // approve pool
  const decimals = await token.decimals();
  const dec = Number(decimals.toString ? decimals.toString() : decimals);
  const amount = ethers.parseUnits(AMT.toString(), dec);
  await (await token.approve(POOL, amount)).wait();
  const pool = await ethers.getContractAt("LendingPool", POOL);
  const tx = await pool.fund(TOKEN, amount);
  await tx.wait();
  console.log("Funded pool with tx", tx.hash);
}

main().catch((err) => { console.error(err); process.exitCode = 1; });
