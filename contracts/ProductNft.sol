// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol"; // Import del contratto predisposto da openZeppelin per la creazione di NFTs
import "base64-sol/base64.sol"; // Import del contratto per effettuare la codifica base64
import "hardhat/console.sol"; // Import necessario altrimenti non veniva letto correttamente il nome del contratto nella rete di test locale
import "contracts/NftMarketplace.sol";

contract ProductNft is ERC721 {
    // Variables
    uint256 private s_tokenCounter;
    address private s_owner;
    //string private i_imageURI;
    string internal s_tokenURI;
    /* string private constant base64EncodedSvgPrefix =
        "data:image/svg+xml;base64,"; // Prefisso da utilizzare per comporre l'URL di un'immagine SVG codificata in Base64
 */

    // Errors
    error ProductNft__NotOwner();
    error ERC721Metadata__URI_QueryFor_NonExistentToken();

    // Events
    event MintedNFT(uint256 indexed tokenId, address indexed firstOwner);

    // Modifiers
    modifier onlyOwner() {
        if (msg.sender != s_owner) {
            revert ProductNft__NotOwner();
        }
        _;
    }

    // Constructor
    constructor(
        string memory tokenUri
    ) ERC721("Trusted Product Certificate", "TPC") {
        s_tokenCounter = 0;
        s_owner = msg.sender;
        //i_imageURI = svgToImageURI(image);
        s_tokenURI = tokenUri;
    }

    // Main Functions

    // Creazione dell'NFT: solo il proprietario del contratto (idealmente sarà il Brand) può minare un token di cui diventerà il primo proprietario
    function mintNft() public onlyOwner {
        _safeMint(msg.sender, s_tokenCounter); // Funzione di ERC721
        s_tokenCounter += 1; // Aggiornamento dell'id del token

        emit MintedNFT(s_tokenCounter - 1, msg.sender);
    }

    // Getters
    function getTokenUri() public view returns (string memory) {
        return s_tokenURI;
    }

    function getContractOwner() public view returns (address) {
        return s_owner;
    }

    // Funzioni per processare un file svg

    /* // Funzione per convertire l'XML di un'immagine SVG nell'URL corrispondente (utilizzando la codifica Base64)
    function svgToImageURI(
        string memory svg
    ) public pure returns (string memory) {
        // Vogliamo ottenere la codifica Base64 dell'SVG passato. Per fare ciò possiamo sfruttare lo smart contract base64.sol (importato) il quale ci mette già a disposizione un encoder
        string memory svgBase64Encoded = Base64.encode(
            bytes(string(abi.encodePacked(svg)))
        );

        // Creiamo l'URL a partire dal prefisso e dalla codifica Base64 che abbiamo ottenuto nell'istruzione precedente
        return
            string(abi.encodePacked(base64EncodedSvgPrefix, svgBase64Encoded));
        // NOTA: abi.encodePacked(...) prende i due parametri e li codifica insieme sotto forma di bytes infatti abi.encodePacked ritorna un bytes object di cui andiamo a fare poi un casting a stringa.
        // abi.encodePacked fa parte dei cosiddetti globally available methods and units di Solidity (altri esempi sono msg.sender, msg.value)
        // In sostanza ci permette di concatenare delle stringhe ma fa anche altre cose in più. In particolare, encodePacked fa una sorta di compressione e permette di ottenere bytes objects più piccoli.

        // Abbiamo ottenuto l'URL dell'immagine; ora vogliamo ottenere un oggetto JSON con i metadati del token tra cui l'URL dell'immagine.
        // Dobbiamo quindi inserire l'URL dell'immagine codificata in Base64 all'intenro del JSON e poi codificare in Base64 tutto il JSON stesso in modo da ottenere l'URI da associare al token
    }

    // Funzione che ritorna la stringa contenente l'URI del token (in codifica base64) a partire dal token ID
    function tokenURI(
        uint256 tokenId
    ) public view virtual override returns (string memory) {
        if (!_exists(tokenId)) {
            //La funzione _exists è ereditata da ERC721 e verifica se il token id passato è valido
            revert ERC721Metadata__URI_QueryFor_NonExistentToken();
        }

        // Ricreiamo, tramite una concatenazione di stringhe, il JSON che descrive il nostro token e al suo interno inseriamo l'URL dell'immagine. Avendo richiamato la funzione encodePacked otteniamo un byte object
        // Dopodiché creiamo la codifica base 64 di tutto il token URI
        // Impacchettiamo il tutto insieme al prefisso per il JSON (ritornato dalla funzione _baseURI) e facciamo il cast a stringa
        return (
            string(
                abi.encodePacked(
                    _baseURI(),
                    Base64.encode(
                        bytes(
                            abi.encodePacked(
                                '{"name":"',
                                name(),
                                '", "brand":"XYZ Jewels", "description": "An official luxury product",',
                                '"attributes": [{"material": "diamond", "colours": ["grey","purple"], "pureness": 100, "weight[g]":50}], "image":"',
                                i_imageURI,
                                '"}'
                            )
                        )
                    )
                )
            )
        );
    }

    function _baseURI() internal pure override returns (string memory) {
        return "data:application/json;base64,"; // Prefisso per comporre l'URI del token
    } 
    */
}
