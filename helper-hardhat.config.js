const networkConfig = {
    // Impostiamo l'indirizzo per il coordinator nel caso in cui venga utilizzata la testnet di Sepolia (chainId 11155111)
    11155111: {
        name: "sepolia",
        subscriptionId: "2406", // Preso dal sito vrf.chain.link, connettendo metamask e cliccando su create subscription
        vrfCoordinatorV2: "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625", // Preso dalla documentazione chainlink: https://docs.chain.link/vrf/v2/subscription/supported-networks
        gasLane:
            "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c", // Preso dalla documentazione, è il key hash
        callbackGasLimit: "50000", // Impostato arbitrariamente?
        mintFee: "100000000000000000", // 0.01 ETH. Deciso arbitrariamente da noi. E' la somma da pagare per richiedere il mining dell'NFT
        ethUsdPriceFeed: "0x694AA1769357215DE4FAC081bf1f309aDC325306", // Indirizzo epr il price Feed (utilizzato nel dynamic SVG NFT)
    },
    31337: {
        name: "hardhat",
        // Nel caso della rete di sviluppo locale utilizziamo il coordinator mock. I parametri subscriptionId e vrfCoordinator li otteniamo tramite il mock stesso. Qui di seguito indichiamo ulteriori parametri che possiamo ricopiare da quelli della testnet sepolia
        gasLane:
            "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
        callbackGasLimit: "500000",
        mintFee: "100000000000000000", // 0.01 ETH. Deciso arbitrariamente da noi. E' la somma da pagare per richiedere il mining dell'NFT
    },
}

// Indichiamo le reti che utilizzeremo per lo sviluppo e per le quali vogliamo fare il deploy del mock
const developmentChains = ["hardhat", "localhost", "ganache"]

module.exports = {
    networkConfig, // Esportiamo networkConfig affinché altri script possano lavorare con esso e leggere l'indirizzo del price feed
    developmentChains, // Esportiamo la lista di reti per lo sviluppo
}
