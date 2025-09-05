const fs = require('fs');
const path = require('path');
const { ethers } = require('hardhat');

async function main() {
  const out = process.env.ABI_OUT_DIR || path.join(__dirname, '..', 'abis');
  if (!fs.existsSync(out)) fs.mkdirSync(out, { recursive: true });
  const contracts = ['ERC20Mock','Mixer','LendingPool','CollateralManager'];
  for (const name of contracts) {
    try {
      const artifact = await artifacts.readArtifact(name);
      fs.writeFileSync(path.join(out, name + '.json'), JSON.stringify(artifact, null, 2));
      console.log('Wrote', name + '.json');
    } catch (e) {
      console.warn('Skipped', name, e.message);
    }
  }
  console.log('ABIs exported to', out);
}

main().catch((e)=>{console.error(e);process.exitCode=1});
