const hre = require("hardhat");

async function debugMixer() {
    console.log("🔍 Debugging Mixer contract...");

    const [signer] = await hre.ethers.getSigners();
    console.log("Account:", signer.address);

    const mixerAddress = "0x2dC7302afA5CEB66a1e322f61Eb2E3497a9eFBb0";
    const collateralManagerAddress = "0x08E28B20E9679D2d2ca92d242480f29e40a66F24";

    try {
        const mixer = await hre.ethers.getContractAt("Mixer", mixerAddress);

        // 检查 collateralManager 是否设置
        const cm = await mixer.collateralManager();
        console.log("Mixer collateralManager:", cm);
        console.log("Expected collateralManager:", collateralManagerAddress);
        console.log("CollateralManager set correctly:", cm.toLowerCase() === collateralManagerAddress.toLowerCase());

        // 检查一个简单的存款，使用更小的金额
        console.log("\n💰 Testing small ETH deposit...");

        const depositAmount = hre.ethers.parseEther("0.001"); // 0.001 ETH
        const nullifier = hre.ethers.randomBytes(32);
        const secret = hre.ethers.randomBytes(32);
        const commitment = hre.ethers.keccak256(
            hre.ethers.concat([nullifier, secret])
        );

        console.log("Trying to deposit:", hre.ethers.formatEther(depositAmount), "ETH");
        console.log("Commitment:", commitment);

        // 检查存款是否已存在
        try {
            const existingDeposit = await mixer.getDeposit(commitment);
            console.log("Existing deposit amount:", existingDeposit[1].toString());
            if (existingDeposit[1] > 0) {
                console.log("❌ Commitment already exists!");
                return;
            }
        } catch (e) {
            console.log("No existing deposit found (good)");
        }

        // 尝试存款
        try {
            // 估算 gas
            const gasEstimate = await mixer.deposit.estimateGas(
                commitment,
                "0x0000000000000000000000000000000000000000", // 使用明确的零地址
                depositAmount,
                { value: depositAmount }
            );
            console.log("Gas estimate:", gasEstimate.toString());

            const depositTx = await mixer.deposit(
                commitment,
                "0x0000000000000000000000000000000000000000", // 使用明确的零地址
                depositAmount,
                {
                    value: depositAmount,
                    gasLimit: gasEstimate * 120n / 100n // 增加 20% gas
                }
            );

            console.log("✅ Deposit transaction sent:", depositTx.hash);
            const receipt = await depositTx.wait();
            console.log("✅ Deposit confirmed in block:", receipt.blockNumber);

            // 验证存款
            const depositInfo = await mixer.getDeposit(commitment);
            console.log("\nDeposit verification:");
            console.log("- Token:", depositInfo[0]);
            console.log("- Amount:", hre.ethers.formatEther(depositInfo[1]), "ETH");
            console.log("- Withdrawn:", depositInfo[2]);
            console.log("- Locked:", depositInfo[3]);

            console.log("\n🎉 ETH deposit successful!");

        } catch (error) {
            console.error("❌ Deposit failed:", error.message);

            // 尝试解析错误原因
            if (error.data) {
                try {
                    const decodedError = mixer.interface.parseError(error.data);
                    console.error("Decoded error:", decodedError);
                } catch (e) {
                    console.error("Raw error data:", error.data);
                }
            }

            // 如果有 reason，显示
            if (error.reason) {
                console.error("Error reason:", error.reason);
            }

            throw error;
        }

    } catch (error) {
        console.error("❌ Contract interaction failed:", error.message);
        throw error;
    }
}

debugMixer()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Debug failed:", error);
        process.exit(1);
    });
