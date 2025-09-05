const fs = require("fs");
const path = require("path");

async function generateABIs() {
    console.log("🔧 Generating contract ABIs...");

    const artifactsDir = path.join(__dirname, "..", "artifacts", "Contracts");
    const abisDir = path.join(__dirname, "..", "src", "abis");

    // 确保 abis 目录存在
    if (!fs.existsSync(abisDir)) {
        fs.mkdirSync(abisDir, { recursive: true });
    }

    const contracts = [
        "Mixer",
        "LendingPool",
        "CollateralManager",
        "ERC20Mock"
    ];

    for (const contractName of contracts) {
        try {
            const artifactPath = path.join(artifactsDir, `${contractName}.sol`, `${contractName}.json`);

            if (fs.existsSync(artifactPath)) {
                const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
                const abi = artifact.abi;

                // 保存 ABI 到前端目录
                fs.writeFileSync(
                    path.join(abisDir, `${contractName}.json`),
                    JSON.stringify(abi, null, 2)
                );

                console.log(`✅ Generated ABI for ${contractName}`);
            } else {
                console.log(`⚠️ Artifact not found for ${contractName}`);
            }
        } catch (error) {
            console.error(`❌ Error generating ABI for ${contractName}:`, error.message);
        }
    }

    console.log("🎉 ABI generation completed!");
}

generateABIs()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ ABI generation failed:", error);
        process.exit(1);
    });
