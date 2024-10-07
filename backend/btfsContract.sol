// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TronTrial {
    
    
    mapping(address => uint256[]) filenumber;
    mapping(address => mapping(uint256 => string[]) ) Versions;
    mapping(address => uint256) public userFileCount;

    mapping (string => uint256) cid_filenumber;
    
    function uploadfile(string memory cid) external{
        userFileCount[msg.sender]++;
        
        
        filenumber[msg.sender].push(userFileCount[msg.sender]);
        
        // Add the CID to the version list for the latest file number
        Versions[msg.sender][userFileCount[msg.sender]].push(cid);
        
        // Map the CID to the file number
        cid_filenumber[cid] = userFileCount[msg.sender];
        
    }
    function retrieveFileByNumber(uint256 fileNumber) external view returns (string[] memory) {
        require(fileNumber > 0 && fileNumber <= userFileCount[msg.sender], "Invalid file number");
        return Versions[msg.sender][fileNumber];
    }

    function retrieveFileByCid(string memory cid) external view returns (string[] memory) {
        uint256 fileNumber = cid_filenumber[cid];
        require(fileNumber > 0, "File not found");
        return Versions[msg.sender][fileNumber];
    }
}
