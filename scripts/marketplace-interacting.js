const { ethers, network, deployments, getNamedAccounts } = require("hardhat")

async function main() {
    // const { deployer, user } = await getNamedAccounts()
    const accounts = await ethers.getSigners() // Meglio ricavare gli account tramite getSigners() altrimenti dà errore
    const deployer = accounts[0]
    const user = accounts[1]
    let marketplaceContract, productNftContract, marketplace, productNft
    const TOKEN_ID = 0 // token id dell'NFT da manipolare in questo script
    const PRICE = ethers.utils.parseEther("0.001")

    // Recupero degli smart contract e connessione con il deployer

    marketplaceContract = await ethers.getContract("NftMarketplace")
    marketplace = marketplaceContract.connect(deployer)

    productNftContract = await ethers.getContract("ProductNft")
    productNft = productNftContract.connect(deployer)

    console.log("--------------------------")
    console.log(`Marketplace has address: ${marketplace.address.toString()}`)

    // Creazione dell'NFT si assume fatta da un altro script. Il Deployer è l'attuale proprietario

    console.log("--------------------------")
    console.log("Approvazione NFT...")
    const approvalTx = await productNft.approve(
        marketplaceContract.address,
        TOKEN_ID
    ) // Bisogna fornire l'approvazione al marketplace per spostare l'NFT
    await approvalTx.wait(1)

    // Deployer mette in vendita il proprio NFT

    console.log("Pubblicazione annuncio vendita...")
    const tx = await marketplace.listItem(productNft.address, TOKEN_ID, PRICE)
    await tx.wait(1)
    const listing = await marketplace.getListing(productNft.address, TOKEN_ID)
    console.log("Dettagli annuncio:")
    console.log(`NFT address: ${productNft.address}`)
    console.log(`NFT token ID: ${TOKEN_ID}`)
    console.log(`Prezzo: ${listing.price.toString()}`)
    console.log(`Venditore: ${listing.seller.toString()}`)

    // User acquista l'NFT messo in vendita da Deployer
    console.log("---------------------------")
    console.log("Acquisto da parte di user...")
    marketplace = marketplaceContract.connect(user)
    const buyItemTx = await marketplace.buyItem(productNft.address, TOKEN_ID, {
        value: PRICE,
    })
    await buyItemTx.wait(1)
    console.log("Acquisto avvenuto con successo")
    productNft = productNftContract.connect(user)
    const owner2 = await productNft.ownerOf(TOKEN_ID)
    console.log(`Nuovo proprietario: ${owner2.toString()}`)
}

// Chiamata alla funzione main appena definita
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
