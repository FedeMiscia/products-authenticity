const { SentinelClient } = require("defender-sentinel-client")
require("dotenv").config()

const creds = {
    apiKey: process.env.DEFENDER_API_KEY,
    apiSecret: process.env.DEFENDER_API_SECRET,
}
const client = new SentinelClient(creds)

// Setup delle notifiche
const notification = await client.createNotificationChannel("email", {
    name: "MyEmailNotification",
    config: {
        emails: ["fedemiscia@gmail.com"],
    },
    paused: false,
})

const contractAddress = "0x2342b33cDc41a44c70d57A0a8dAfCDB6c22A5a17" // Indirizzo del marketplace deployato su sepolia
const abi =
    '[{"inputs":[{"internalType":"uint256","name":"returnTime","type":"uint256"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[{"internalType":"address","name":"nftAddress","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"NftMarketplace__AlreadyListed","type":"error"},{"inputs":[],"name":"NftMarketplace__NotAllowed","type":"error"},{"inputs":[],"name":"NftMarketplace__NotApprovedForMarketplace","type":"error"},{"inputs":[{"internalType":"address","name":"nftAddress","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"NftMarketplace__NotInStaking","type":"error"},{"inputs":[{"internalType":"address","name":"nftAddress","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"NftMarketplace__NotListed","type":"error"},{"inputs":[],"name":"NftMarketplace__NotOwner","type":"error"},{"inputs":[],"name":"NftMarketplace__StillTimeToRecess","type":"error"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"buyer","type":"address"},{"indexed":true,"internalType":"address","name":"nftAddress","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"ItemBought","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"seller","type":"address"},{"indexed":true,"internalType":"address","name":"nftAddress","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"ItemCancelled","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"seller","type":"address"},{"indexed":true,"internalType":"address","name":"nftAddress","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"ItemListed","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"nftAddress","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"},{"indexed":false,"internalType":"address","name":"owner","type":"address"}],"name":"TokenGetBack","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"from","type":"address"},{"indexed":false,"internalType":"address","name":"to","type":"address"},{"indexed":true,"internalType":"address","name":"nftAddress","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"Token_Transfered","type":"event"},{"inputs":[{"internalType":"address","name":"nftAddress","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"buyItem","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"nftAddress","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"cancelListing","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes","name":"address_id_encoded","type":"bytes"}],"name":"checkUpkeep","outputs":[{"internalType":"bool","name":"upkeepNeeded","type":"bool"},{"internalType":"bytes","name":"performData","type":"bytes"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getReturnTime","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"nftAddress","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"getSeller","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"nftAddress","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"getTransaction","outputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"nftAddress","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"listItem","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes","name":"encoded","type":"bytes"}],"name":"multiDecodeNFTData","outputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"address","name":"nftAddress","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"multiEncodeNFTData","outputs":[{"internalType":"bytes","name":"","type":"bytes"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"bytes","name":"performData","type":"bytes"}],"name":"performUpkeep","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"nftAddress","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"takeBackToken","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"nftAddress","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"transferTokenAfterTime","outputs":[],"stateMutability":"nonpayable","type":"function"}]'

//
const requestParameters = {
    type: "BLOCK",
    network: "sepolia",
    // optional
    confirmLevel: 1, // if not set, we pick the blockwatcher for the chosen network with the lowest offset
    name: "NftMarketplace",
    address: contractAddress, // indirizzo del contratto da monitorare (marketplace)
    abi: abi,
    // optional
    paused: false,
    // optional
    eventConditions: [],
    // optional
    functionConditions: [
        {
            functionSignature: "buyItem(address, uint256)",
        },
    ],
    // optional
    txCondition: "status=='success'",
    // optional
    autotaskCondition: "cb3838cb-b6e9-45c1-9f34-e67e19fc81ee", // Ottenuto dopo aver eseguito lo script per la creazione dell'autotask
    // optional
    autotaskTrigger: [],
    // optional
    alertThreshold: {
        amount: 2,
        windowSeconds: 3600,
    },
    // optional
    alertTimeoutMs: 0,
    notificationChannels: [notification.notificationId],
    // optional
    // notificationChannels take priority over notification categories
    // in this instance, notificationCategoryId will be ignored, unless notificationChannels is empty
    notificationCategoryId: "66a753ae-90ed-4373-a360-1c3f79610d15",
    // optional
    riskCategory: "TECHNICAL",
}
