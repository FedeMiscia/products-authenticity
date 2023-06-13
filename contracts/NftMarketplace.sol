// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol"; // Import necessario per poter richiamare alcune funzioni che manipolano gli NFT, tra cui la funzione di approvazione per lavorare con un NFT e la funzione per trasferire un NFT
import "@openzeppelin/contracts/security/ReentrancyGuard.sol"; //Import necessario per il modifier nonReentrant
import "@chainlink/contracts/src/v0.8/AutomationCompatible.sol";

error NftMarketplace__NotApprovedForMarketplace();
error NftMarketplace__AlreadyListed(address nftAddress, uint256 tokenId);
error NftMarketplace__NotOwner();
error NftMarketplace__NotListed(address nftAddress, uint256 tokenId);
error NftMarketplace__TransferFailed();
error NftMarketplace__StillTimeToRecess();
error NftMarketplace__NotInStaking(address nftAddress, uint256 tokenId);
error NftMarketplace__NotAllowed();

// Contratto che gestisce la compravendita di NFT. Ereditiamo da ReentrancyGuard per alcune funzionalità di sicurezza e dall'interfaccia AutomationCompatible per introdurre dell'automazione nelle funzioni
contract NftMarketplace is ReentrancyGuard, AutomationCompatibleInterface {
    // Struttura dati per gestire lo staking di un NFT appena effettuato l'acquisto del corrispondente prodotto.
    // Nel lasso di tempo in cui è possibile riportare indietro un prodotto il marketplace detiene in staking l'NFT prima di trasferirlo ufficialmente.
    // Bisogna quindi tenere traccia dell'NFT in staking, del tempo rimanente, del venditore e dell'acquirente
    struct Transaction {
        address seller;
        address buyer;
        uint startTimestamp; // Timestamp del momento dell'acquisto
    }

    // Evento che sarà emesso dopo il listing di un NFT
    event ItemListed(
        address indexed seller,
        address indexed nftAddress,
        uint256 indexed tokenId
    );

    // Evento emesso a seguito del completamento della funzione di acquisto
    event ItemBought(
        address indexed buyer,
        address indexed nftAddress,
        uint256 indexed tokenId
    );

    event ItemCancelled(
        address indexed seller,
        address indexed nftAddress,
        uint256 indexed tokenId
    );

    event TokenGetBack(
        address indexed nftAddress,
        uint256 indexed tokenId,
        address owner
    );

    event Token_Transfered(
        address from,
        address to,
        address indexed nftAddress,
        uint256 indexed tokenId
    );

    // Utilizziamo una struttura dati che effettua il seguente mapping per un NFT messo in lista di vendita:
    // Contract NFT address -> NFT Token Id -> Seller address
    mapping(address => mapping(uint256 => address)) private s_listings;

    // Mapping per un NFT che si trova nello staking
    mapping(address => mapping(uint256 => Transaction)) private s_stakings;

    //Tempo limite entro il quale poter restituire il prodotto (e dunque l'NFT)
    uint s_returnTime;

    // Modifiers

    // Modifier per assicurarci che non venga (ri)messo in vendita un NFT già listato in precedenza
    modifier checkListed(address nftAddress, uint256 tokenId) {
        address seller = s_listings[nftAddress][tokenId];
        address defaultAddress; // 0x0000000000000000000000000000000000000000
        if (seller != defaultAddress) {
            // Se il venditore è diverso dall'account "vuoto" allora revert perché l'NFT è già stato messo in vendita
            revert NftMarketplace__AlreadyListed(nftAddress, tokenId);
        }
        _;
    }

    // Modifier per fare in modo un NFT possa essere messo in vendita esclusivamente dal legittimo proprietario
    modifier onlyNftOwner(
        address nftAddress,
        uint256 tokenId,
        address spender
    ) {
        IERC721 nft = IERC721(nftAddress);
        address owner = nft.ownerOf(tokenId); // La funzione ownerOf di IERC721 restituisce l'indirizzo del proprietario dell?NFT con l'id passato come parametro
        if (owner != spender) {
            //Se l'indirizzo del proprietario non corrisponde con l'indirizzo di chi sta tentando di mettere in vendita l'NFT facciamo il revert
            revert NftMarketplace__NotOwner();
        }
        _;
    }

    // Modifier per verificare che un NFT è in lista di vendita. Verrà utilizzato nella funzione di acquisto
    modifier isListed(address nftAddress, uint256 tokenId) {
        address seller = s_listings[nftAddress][tokenId]; // preleviamo l'indirizzo del venditore dal listing
        address defaultAddress;
        if (seller == defaultAddress) {
            // Se l'indirizzo del venditore è un indirizzo nullo allora revert: l'NFT non è in vendita
            revert NftMarketplace__NotListed(nftAddress, tokenId);
        }
        _;
    }

    // Modifier per controllare che il trasferimento dell'NFT possa avvenire, decorso il tempo di recesso. E' una sorta di trigger
    modifier stakeCheck(address nftAddress, uint256 tokenId) {
        uint start = s_stakings[nftAddress][tokenId].startTimestamp;
        if (block.timestamp < (start + s_returnTime)) {
            revert NftMarketplace__StillTimeToRecess();
        }
        _;
    }

    // Modifier che permette la restituzione dell'NFT solo se esso è in staking (cioè siamo ancora nel periodo di recesso)
    modifier inStaking(address nftAddress, uint256 tokenId) {
        uint startTimestamp = s_stakings[nftAddress][tokenId].startTimestamp;
        if (startTimestamp == 0) {
            revert NftMarketplace__NotInStaking(nftAddress, tokenId);
        }
        _;
    }

    // Modifier affinché la restituzione dell'NFT sia richiamabile solamente da colui che risulta il buyer nella struttura dati Transaction
    modifier onlyBuyer(address nftAddress, uint256 tokenId) {
        address buyer = s_stakings[nftAddress][tokenId].buyer;
        if (msg.sender != buyer) {
            revert NftMarketplace__NotAllowed();
        }
        _;
    }

    // Constructor
    constructor(uint returnTime) {
        s_returnTime = returnTime;
    }

    /////////////////////
    // Main Functions //
    ////////////////////

    // La funzione per pubblicare un annuncio di vendita la definiamo come external perché vogliamo che possa essere richiamata anche da progetti esterni o account esterni
    // Dobbiamo assicurarci inoltre che l'NFT in questione non sia già stato messo in vendita precedentemente e che chi richiama la funzione sia effettivamente il proprietario dell'NFT. Queste due verifiche le facciamo tramite due modifiers
    function listItem(
        address nftAddress,
        uint256 tokenId
    )
        external
        checkListed(nftAddress, tokenId)
        onlyNftOwner(nftAddress, tokenId, msg.sender)
    {
        // I proprietari di NFT, quando pubblicano un "annuncio di vendita", mantengono comunque la proprietà dei propri NFT ma danno l'approvazione al marketplace di trasferire l'NFT per loro conto.

        // Ci dobbiamo assicurare che il contratto marketplace ottenga l'approvazione per lavorare con l'NFT.
        // A tal proposito possiamo richiamare la funzione getApproved() dell'interfaccia IERC721 che abbiamo importato
        IERC721 nft = IERC721(nftAddress); // Creiamo un oggetto di tipo IERC721 passando all'interfaccia l'indirizzo del contratto relativo all'NFT da manipolare
        if (nft.getApproved(tokenId) != address(this)) {
            //Alla getApproved passiamo l'id del token. Se l'account approvato per manipolare il token con quell'id risulta diverso dall'account relativo al marketplace allora facciamo il revert
            revert NftMarketplace__NotApprovedForMarketplace();
        }

        s_listings[nftAddress][tokenId] = msg.sender; // Update del mapping con le informazioni sul venitore, cioè colui che richiama la funzione listItem
        emit ItemListed(msg.sender, nftAddress, tokenId); // Emissione dell'evento relativo al listing avvenuto
    }

    //Funzione di acquisto che innesca lo staking dell'NFT per il lasso di tempo di possibile rimborso
    //External perchè solamente persone o altri smart contract al di fuori di questo andranno a richiamare la funzione buyItem.
    //N.B pagamento non gestito tramite criptomoneta
    function buyItem(
        address nftAddress,
        uint256 tokenId
    ) external isListed(nftAddress, tokenId) nonReentrant {
        // Recupero del venditore
        address nftSeller = s_listings[nftAddress][tokenId];

        // Si popola la struttura dati Transaction che interessa l'NFT
        s_stakings[nftAddress][tokenId].seller = nftSeller;
        s_stakings[nftAddress][tokenId].buyer = msg.sender;
        s_stakings[nftAddress][tokenId].startTimestamp = block.timestamp;

        // A questo punto dobbiamo eliminare l'annuncio di vendita dal mapping s_listings
        delete (s_listings[nftAddress][tokenId]); // La funzione delete permette di eliminare un entry da un mapping

        emit ItemBought(msg.sender, nftAddress, tokenId);
    }

    function transferTokenAfterTime(
        address nftAddress,
        uint256 tokenId
    ) external stakeCheck(nftAddress, tokenId) inStaking(nftAddress, tokenId) {
        // Terminato il tempo per la restituzione (senza precedente recesso): avviene il passaggio ufficiale di proprietà
        // Trasferimento del token dal venditore all'acquirente (recuperati dalla struttura dati Transaction)
        address from = s_stakings[nftAddress][tokenId].seller;
        address to = s_stakings[nftAddress][tokenId].buyer;

        // Reset dell'entry legata all'NFT in questione all'interno del mapping
        delete (s_stakings[nftAddress][tokenId]);

        // Per il trasferiento utilizziamo la funzione safeTransferFrom di IERC721 a cui dobbiamo passare: from, to e tokenId
        IERC721(nftAddress).safeTransferFrom(from, to, tokenId);
        emit Token_Transfered(from, to, nftAddress, tokenId);
    }

    function takeBackToken(
        address nftAddress,
        uint256 tokenId
    ) external inStaking(nftAddress, tokenId) onlyBuyer(nftAddress, tokenId) {
        address owner = s_stakings[nftAddress][tokenId].seller;
        delete (s_stakings[nftAddress][tokenId]);
        emit TokenGetBack(nftAddress, tokenId, owner);
    }

    // Le due seguenti funzioni servono per redere compatibile lo smart contract con l'interfaccia AutomationCompatible
    // La checkUpkeep riceve come parametro di input dei bytes: gli passeremo l'indirizzo dell'NFT e il token id codificati
    function checkUpkeep(
        bytes calldata address_id_encoded
    )
        external
        view
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        (address nftAddress, uint256 tokenId) = multiDecodeNFTData(
            address_id_encoded
        );
        uint256 startTimestamp = s_stakings[nftAddress][tokenId].startTimestamp;

        upkeepNeeded = block.timestamp > (startTimestamp + s_returnTime);
        performData = address_id_encoded;
    }

    function performUpkeep(bytes calldata performData) external override {
        //We highly recommend revalidating the upkeep in the performUpkeep function
        (address nftAddress, uint256 tokenId) = multiDecodeNFTData(performData);
        uint256 startTimestamp = s_stakings[nftAddress][tokenId].startTimestamp;
        if (block.timestamp > (startTimestamp + s_returnTime)) {
            address seller = s_stakings[nftAddress][tokenId].seller;
            address buyer = s_stakings[nftAddress][tokenId].buyer;

            // Trasferimento del token dal venditore all'acquirente (cioè a chi sta richiamando la funzione corrente)
            // Per fare ciò utilizziamo la funzione safeTransferFrom di IERC721 a cui dobbiamo passare: from, to e tokenId
            IERC721(nftAddress).safeTransferFrom(seller, buyer, tokenId);
        }
    }

    // Funzione per rimuovere un NFT dal marketplace.
    // Utilizziamo il modifer per assicurarci che solo il proprietario dell'NFT possa richiamare tale funzione
    // Utilizziamo il modifier per assicurarci che l?NFT da rimuovere sia stato precedentemente messo in vendita
    function cancelListing(
        address nftAddress,
        uint256 tokenId
    )
        external
        onlyNftOwner(nftAddress, tokenId, msg.sender)
        isListed(nftAddress, tokenId)
    {
        delete (s_listings[nftAddress][tokenId]);
        emit ItemCancelled(msg.sender, nftAddress, tokenId);
    }

    // Funzioni ausiliarie
    function multiEncodeNFTData(
        address nftAddress,
        uint256 tokenId
    ) public pure returns (bytes memory) {
        bytes memory someString = abi.encode(nftAddress, tokenId);
        return someString;
    }

    function multiDecodeNFTData(
        bytes memory encoded
    ) public pure returns (address, uint256) {
        (address nftAddress, uint256 tokenId) = abi.decode(
            encoded,
            (address, uint256)
        );
        return (nftAddress, tokenId);
    }

    /*  // Aggiornamento informazioni del Listing (prezzo di vendita)
    function updateListing(
        address nftAddress,
        uint256 tokenId,
        uint256 newPrice
    )
        external
        onlyNftOwner(nftAddress, tokenId, msg.sender)
        isListed(nftAddress, tokenId)
    {
        s_listings[nftAddress][tokenId].price = newPrice;
        emit ItemListed(msg.sender, nftAddress, tokenId, newPrice); // Update = nuovo Listing
    } */

    /* // Funzione tramite cui ogni venditore può ritirare quanto accumulato dalle vendite portate a termine
    function withdrawProceeds() external {
        uint256 proceeds = s_proceeds[msg.sender]; // Ricaviamo la somma disponibile per il prelievo (quanto ottenuto fino a questo momento dalle vendite)
        if (proceeds <= 0) {
            revert NftMarketplace__NoProceeds();
        }
        // Se la somma disponibile al ritiro è maggiore di 0 allora aggiornamento della struttura dati e invio dei soldi a chi ha richiamato la funzione
        s_proceeds[msg.sender] = 0;

        (bool success, ) = payable(msg.sender).call{value: proceeds}("");
        if (!success) {
            revert NftMarketplace__TransferFailed();
        }
    }
 */
    // Getters

    function getSeller(
        address nftAddress,
        uint256 tokenId
    ) public view returns (address) {
        return s_listings[nftAddress][tokenId];
    }

    function getTransaction(
        address nftAddress,
        uint256 tokenId
    ) public view returns (address, address) {
        address nftSeller = s_stakings[nftAddress][tokenId].seller;
        address nftBuyer = s_stakings[nftAddress][tokenId].buyer;
        return (nftSeller, nftBuyer);
    }

    function getReturnTime() public view returns (uint) {
        return s_returnTime;
    }
}
