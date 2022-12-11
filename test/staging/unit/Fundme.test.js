const { deployments, ethers, getNamedAccounts } = require("hardhat");
const { assert, expect } = require("chai");
const { developmentChains } = require("../../../helper-hardhat-config");

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("FundMe", async () => {
          let fundMe, deployer, mockV3Aggregator;

          let sendValue = ethers.utils.parseEther("51");

          beforeEach(async function () {
              // deploy our fundMe contract
              // using hardhat-deploy
              deployer = (await getNamedAccounts()).deployer;
              await deployments.fixture(["all"]);
              fundMe = await ethers.getContract("FundMe", deployer);
              mockV3Aggregator = await ethers.getContract(
                  "MockV3Aggregator",
                  deployer
              );
          });

          describe("contructor", async function () {
              it("sets the aggregator addresses correctly", async function () {
                  let response = await fundMe.getPriceFeed();
                  assert.equal(response, mockV3Aggregator.address);
              });
          });

          describe("fund", async function () {
              it("fails if you don't send enough Eth", async function () {
                  (await expect(fundMe.fund())).to.be.revertedWith(
                      "You need to spend more ETH!"
                  );
              });

              it("Updated the amount funded data structure", async function () {
                  console.log(sendValue);
                  await fundMe.fund({ value: sendValue });
                  let response = await fundMe.getAddressToAmountFunded(
                      deployer
                  );
                  assert.equal(response.toString(), sendValue.toString());
              });

              it("Add funder to the funders array", async function () {
                  await fundMe.fund({ value: sendValue });
                  let response = await fundMe.getFunder(0);
                  assert.equal(response, deployer);
              });
          });

          describe("withDraw", async function () {
              beforeEach(async function () {
                  await fundMe.fund({ value: sendValue });
              });

              it("WithDraw eth from a single funder", async function () {
                  const startingFundMeBalance =
                      await ethers.provider.getBalance(fundMe.address);
                  const startingDeployerBalance =
                      await ethers.provider.getBalance(deployer);

                  const transactionResponse = await fundMe.withdraw();
                  const transactionReceipt = await transactionResponse.wait(1);

                  const { gasUsed, effectiveGasPrice } = transactionReceipt;

                  const gasCost = gasUsed.mul(effectiveGasPrice);

                  const endingFundMeBalance = await ethers.provider.getBalance(
                      fundMe.address
                  );
                  const endingDeployerBalance =
                      await ethers.provider.getBalance(deployer);

                  assert.equal(endingFundMeBalance, 0);
                  assert.equal(
                      startingFundMeBalance
                          .add(startingDeployerBalance)
                          .toString(),
                      endingDeployerBalance.add(gasCost).toString()
                  );
              });

              it("only allower owner to withdraw", async function () {
                  const accounts = await ethers.getSigners();
                  const attacker = accounts[1];
                  const attackerConnectedContract = await fundMe.connect(
                      attacker
                  );
                  await expect(
                      attackerConnectedContract.withdraw()
                  ).to.be.revertedWith("FundMe__NotOwner");
              });

              it("CheapWithDraw eth from a single funder", async function () {
                  const startingFundMeBalance =
                      await ethers.provider.getBalance(fundMe.address);
                  const startingDeployerBalance =
                      await ethers.provider.getBalance(deployer);

                  const transactionResponse = await fundMe.cheapWithdraw();
                  const transactionReceipt = await transactionResponse.wait(1);

                  const { gasUsed, effectiveGasPrice } = transactionReceipt;

                  const gasCost = gasUsed.mul(effectiveGasPrice);

                  const endingFundMeBalance = await ethers.provider.getBalance(
                      fundMe.address
                  );
                  const endingDeployerBalance =
                      await ethers.provider.getBalance(deployer);

                  assert.equal(endingFundMeBalance, 0);
                  assert.equal(
                      startingFundMeBalance
                          .add(startingDeployerBalance)
                          .toString(),
                      endingDeployerBalance.add(gasCost).toString()
                  );
              });
          });
      });
