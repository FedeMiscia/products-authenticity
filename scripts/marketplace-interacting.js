const { ethers, network, deployments, getNamedAccounts } = require("hardhat")

async function main() {
    // const { deployer, user } = await getNamedAccounts()
    const accounts = await ethers.getSigners()
    const deployer = accounts[0]
    const user = accounts[1]
    let marketplaceContract, productNftContract, marketplace, productNft
    const TOKEN_ID = 0
    const PRICE = ethers.utils.parseEther("0.1")

    // Recupero degli smart contract e connessione con il deployer

    marketplaceContract = await ethers.getContract("NftMarketplace")
    marketplace = marketplaceContract.connect(deployer)

    productNftContract = await ethers.getContract("ProductNft")
    productNft = productNftContract.connect(deployer)

    console.log(`Marketplace has address: ${marketplace.address.toString()}`)

    // Creazione dell'NFT si assume fatta da un altro script. Il Deployer è l'attuale proprietario
    // const productNftMintTx = await productNft.mintNft()
    // await productNftMintTx.wait(1)
    console.log(`Product NFT has tokenURI: ${await productNft.getTokenUri()}`)
    console.log(`Nft has address: ${productNft.address.toString()}`)
    await productNft.approve(marketplaceContract.address, TOKEN_ID)

    const owner1 = await productNft.ownerOf(TOKEN_ID)
    console.log("-------------------------------")
    console.log(`Primo proprietario: ${owner1.toString()}`)

    // Deployer mette in vendita il proprio NFT

    console.log("Pubblicazione annuncio vendita...")
    await marketplace.listItem(productNft.address, TOKEN_ID, PRICE)
    const listing = await marketplace.getListing(productNft.address, TOKEN_ID)
    console.log("Dettagli annuncio:")
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
