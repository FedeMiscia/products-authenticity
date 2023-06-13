const { assert, expect } = require("chai")
const { network, deployments, ethers, getNamedAccounts } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat.config.js")

!developmentChains.includes(network.name)
    ? describe.skip // Se non siamo su una rete di sviluppo locale ignoriamo questi test
    : describe("Nft Marketplace Tests", function () {
          let nftMarketplace, productNft, deployer, user
          const PRICE = ethers.utils.parseEther("0.001")
          const TOKEN_ID = 0
          beforeEach(async function () {
              //deployer = (await getNamedAccounts()).deployer
              //user = (await getNamedAccounts()).user

              // Preleviamo gli account tramite la funzione getSigner per non avere problemi quando successivamente ci connetteremo allo smart contract.
              // getNamedAccounts() e getSigners() infatti fanno concettualmente la stessa cosa ma restituiscono due tipologie di account leggermente diverse
              const accounts = await ethers.getSigners()
              deployer = accounts[0]
              user = accounts[1]

              await deployments.fixture(["main"]) //Eseguiamo tutti gli script nella cartella deploy che hanno il tag "main", cioè i due script per il deploy del marketplace e del productNFT
              nftMarketplace = await ethers.getContract("NftMarketplace") // La getContract preleva lo smart contract specificato utilizzando di default l'account 0 (che corrisponde a quello che abbiamo chiamato deployer)

              productNft = await ethers.getContract("ProductNft")
              await productNft.mintNft()

              // Il proprietario dell'NFT deve approvare il marketplace a trasferire l'NFT per suo conto in caso di vendita
              await productNft.approve(nftMarketplace.address, TOKEN_ID)
          })

          describe("listItem test", function () {
              it("list NFT to buy it", async function () {
                  await nftMarketplace.listItem(
                      productNft.address,
                      TOKEN_ID,
                      PRICE
                  ) // Il proprietario (siamo ancora connessi con il deployer) mette in vendita il prodotto

                  const userConnectedNftMarketplace =
                      await nftMarketplace.connect(user) // Ci connettiamo con l'account user per acquistare il prodotto

                  await userConnectedNftMarketplace.buyItem(
                      productNft.address,
                      TOKEN_ID,
                      { value: PRICE }
                  )

                  // Controlliamo che sia cambiato il proprietario dell'NFT
                  const newOwner = await productNft.ownerOf(TOKEN_ID) // Gli NFT costruiti sullo standard ERC721 hanno sempre la funzione ownerOf

                  // Controlliamo che il venditore (deployer) sia stato pagato
                  const deployerProceeds = await nftMarketplace.getProceeds(
                      deployer.address
                  )

                  // Assert
                  assert(newOwner.toString() == user.address)
                  assert(deployerProceeds.toString() == PRICE.toString())
              })

              it("emits an event after listing an item", async function () {
                  expect(
                      await nftMarketplace.listItem(
                          productNft.address,
                          TOKEN_ID,
                          PRICE
                      )
                  ).to.emit("ItemListed")
              })

              it("esclusively items that haven't been listed yet", async function () {
                  await nftMarketplace.listItem(
                      productNft.address,
                      TOKEN_ID,
                      PRICE
                  )
                  await expect(
                      nftMarketplace.listItem(
                          productNft.address,
                          TOKEN_ID,
                          PRICE
                      )
                  ).to.be.revertedWithCustomError(
                      nftMarketplace,
                      "NftMarketplace__AlreadyListed"
                  )
              })
          })
      })
