// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TronTrial {
    mapping(address => string[]) private folderNames;
    mapping(address => mapping(string => string[])) private folderFiles;
    function uploadFileToFolder(
        string memory folderName,
        string memory cid
    ) external {
        if (folderFiles[msg.sender][folderName].length == 0) {
            folderNames[msg.sender].push(folderName);
        }
        folderFiles[msg.sender][folderName].push(cid);
    }
    function retrieveAllFoldersAndCIDs()
        external
        view
        returns (string[] memory, string[][] memory)
    {
        uint256 folderCount = folderNames[msg.sender].length;
        string[][] memory allCIDs = new string[][](folderCount);
        for (uint256 i = 0; i < folderCount; i++) {
            string memory folderName = folderNames[msg.sender][i];
            allCIDs[i] = folderFiles[msg.sender][folderName];
        }
        return (folderNames[msg.sender], allCIDs);
    }
    function deleteParticularFolder(string memory folderName) external {
        delete folderFiles[msg.sender][folderName];

        // Find and remove the folder from folderNames[msg.sender]
        uint256 folderCount = folderNames[msg.sender].length;

        for (uint256 i = 0; i < folderCount; i++) {
            if (
                keccak256(abi.encodePacked(folderNames[msg.sender][i])) ==
                keccak256(abi.encodePacked(folderName))
            ) {
                // Move the last element to the current position and reduce array length
                folderNames[msg.sender][i] = folderNames[msg.sender][
                    folderCount - 1
                ];
                folderNames[msg.sender].pop();
                break;
            }
        }
    }
    function deleteParticularFile(
        string memory folderName,
        uint256 versionNumber
    ) external {
        require(
            versionNumber < folderFiles[msg.sender][folderName].length,
            "Invalid version number"
        );

        uint256 fileCount = folderFiles[msg.sender][folderName].length;
        for (uint256 i = versionNumber; i < fileCount - 1; i++) {
            folderFiles[msg.sender][folderName][i] = folderFiles[msg.sender][
                folderName
            ][i + 1];
        }
        folderFiles[msg.sender][folderName].pop();

        if (folderFiles[msg.sender][folderName].length == 0) {
            delete folderFiles[msg.sender][folderName];

            uint256 folderCount = folderNames[msg.sender].length;
            for (uint256 i = 0; i < folderCount; i++) {
                if (
                    keccak256(abi.encodePacked(folderNames[msg.sender][i])) ==
                    keccak256(abi.encodePacked(folderName))
                ) {
                    folderNames[msg.sender][i] = folderNames[msg.sender][
                        folderCount - 1
                    ];
                    folderNames[msg.sender].pop();
                    break;
                }
            }
        }
    }
}
