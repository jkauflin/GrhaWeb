/*==============================================================================
(C) Copyright 2023,2024 John J Kauflin, All rights reserved.
--------------------------------------------------------------------------------
DESCRIPTION:  Main module to handle interactions with database and file system
                as well as keeping mediaInfo and menu data structures
--------------------------------------------------------------------------------
Modification History
2023-08-06 JJK  Initial version - moved MediaInfo components to this module
2023-09-08 JJK  Renamed to DataRepository to show its function
2023-09-30 JJK  Adjusted location parameters for albumKey handling
--------------------------------------------------------------------------------
2024-03-29 JJK  Migrating to Azure SWA, blob storage, Cosmos DB with GraphQL
                for queries.  Also, removing Admin functions to make this just
                the presentation functions with no edit
2024-04-04 JJK  Finally got a good structure for MediaInfo container in
                Cosmos DB and got all of the records copied.  Now able to
                do GraphQL queries with "gte" on MediaFileTime integer,
                contains on strings, orderBy on Media, and first maxRows
2024-06-20 JJK  Getting an error from Azure on the MediaType query, so I've
                hard-coded the categories and menu items for now

2024-12-20 JJK  Got the Photos query working for GRHA
2024-12-30 JJK  Working on Docs and filter options
================================================================================*/

import {empty,showLoadingSpinner,addDays,getDateInt} from './util.js';
import {createMediaPage,displayCurrFileList,updateAdminMessage} from './mg-create-pages.js';
export let mediaInfo = {
    filterList: [],
    fileList: [],
    startDate: "",
    menuOrAlbumName: ""}
export let mediaType = 1
export let mediaTypeDesc = "Photos"
export let contentDesc = ""
export var getMenu = false

export var queryCategory = ""

export var categoryList = []
let defaultCategory = ""
let prevCategory = ""

// Look into using environment variables for this (like secrets for Azure credentials)
let musicUri = ""
let docsUri = "https://grhawebstorage.blob.core.windows.net/docs/"
let photosUri = "https://grhawebstorage.blob.core.windows.net/photos/"
let thumbsUri = "https://grhawebstorage.blob.core.windows.net/thumbs/"

export function setMediaType(inMediaType) {
    mediaType = parseInt(inMediaType)
}

export function getFilePath(index,descMod="",fullPath=false) {
    // descMod could be "Thumbs" or "Smaller"
    let fi = mediaInfo.fileList[index]

    if (mediaType == 3) {
        return musicUri + fi.Name
    } else if (mediaType == 4) {
        return docsUri + fi.Name
    } else {
        if (descMod == "Thumbs") {
            return thumbsUri + fi.Name
        } else {
            return photosUri + fi.Name
        }
    }
}

export function getFileName(index) {
    let fi = mediaInfo.fileList[index]
    let fileNameNoExt = fi.Name
    if (mediaType == 3 && fi.Title != '') {
        fileNameNoExt = fi.Title
    }
    let periodPos = fileNameNoExt.indexOf(".");
    if (periodPos >= 0) {
        fileNameNoExt = fileNameNoExt.substr(0,periodPos);
    }
    return fileNameNoExt
}

//------------------------------------------------------------------------------------------------------------
// Query the database for menu and file information and store in js variables
//------------------------------------------------------------------------------------------------------------
export async function queryMediaInfo(paramData) {
    //console.log(">>>>> in the QueryMediaInfo, paramData.MediaFilterMediaType = "+paramData.MediaFilterMediaType)
    //console.log("--------------------------------------------------------------------")
    //console.log("$$$$$ in the QueryMediaInfo, mediaType = "+mediaType)

    getMenu = paramData.getMenu

    // Set a default start date of 60 days back from current date
    mediaInfo.startDate = "1972-01-01"
    mediaInfo.menuOrAlbumName = ""

    //let maxRows = 150
    let maxRows = 200
    let mti = mediaType - 1
    defaultCategory = mediaTypeData[mti].Category[0].CategoryName
    queryCategory = defaultCategory

    let categoryQuery = ""
    if (paramData.MediaFilterCategory != null && paramData.MediaFilterCategory != '' &&
        paramData.MediaFilterCategory != 'ALL' && paramData.MediaFilterCategory != '0') {
        if (paramData.MediaFilterCategory == 'DEFAULT') {
            if (defaultCategory != 'ALL') {
                categoryQuery = `{ CategoryTags: {contains: "${defaultCategory}"} }`
            }
        } else {
            categoryQuery = `{ CategoryTags: {contains: "${paramData.MediaFilterCategory}"} }`
            // Save the parameters from the laste query
            queryCategory = paramData.MediaFilterCategory
        }
        //console.log(">>> categoryQuery = "+categoryQuery)
    }

    let startDateQuery = ""
    console.log("paramData.MediaFilterStartDate = "+paramData.MediaFilterStartDate)
	if (paramData.MediaFilterStartDate != null && paramData.MediaFilterStartDate != '') {
		if (paramData.MediaFilterStartDate == "DEFAULT") {
			paramData.MediaFilterStartDate = mediaInfo.startDate
		} else {
            //startDateQuery = `{ MediaFileTime: { gte: 2023010108 } }`
            startDateQuery = `{ MediaDateTimeVal: { gte: ${getDateInt(paramData.MediaFilterStartDate)} } }`
        }
        //console.log("      int MediaFilterStartDate = "+getDateInt(paramData.MediaFilterStartDate))
	}

    if (paramData.MediaFilterCategory != prevCategory) {
        prevCategory = paramData.MediaFilterCategory
        startDateQuery = ""
    }

    let orderByQuery = "orderBy: { MediaDateTime: ASC },"
    if (mediaType == 4) {
        orderByQuery = "orderBy: { MediaDateTime: DESC },"
    }

    let gql = `query {
            books (
                filter: { 
                    and: [ 
                        { MediaTypeId: { eq: ${mediaType} } }
                        ${categoryQuery}
                        ${startDateQuery}
                    ] 
                },
                ${orderByQuery}
                first: ${maxRows}
            ) {
                items {
                    Name
                    MediaDateTime
                    Title
                }
            }
        }`

    console.log(">>> query gql = "+gql)

    const apiQuery = {
        query: gql,
        variables: {
        }
    }

    const endpoint = "/data-api/graphql";
    const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiQuery)
    });
    const result = await response.json();
    if (result.errors != null) {
        console.log("Error: "+result.errors[0].message);
        console.table(result.errors);
    } else {
        //console.log("result.data = "+result.data)
        mediaInfo.fileList.length = 0
        mediaInfo.fileList = result.data.books.items
        mediaInfo.filterList = []

        if (mediaInfo.fileList.length > 0) {
            mediaInfo.startDate = mediaInfo.fileList[0].MediaDateTime.substring(0,10)
            mediaInfo.menuOrAlbumName = "dt = "+mediaInfo.fileList[0].MediaDateTime

            // Set the filter list elements
            let currYear = mediaInfo.startDate.substring(0,4)
            let lastMediaDateTime = mediaInfo.fileList[result.data.books.items.length-1].MediaDateTime

            let prevYear = parseInt(mediaInfo.startDate.substring(0,4))-1
            let filterRec = {
                filterName: "Prev Year",
                startDate: prevYear.toString()+"-01-01"
            }
            mediaInfo.filterList.push(filterRec)
        
            filterRec = {
                filterName: "Next",
                startDate: lastMediaDateTime
            }
            mediaInfo.filterList.push(filterRec)
            //console.log("Next, startDate: lastMediaDateTime = "+lastMediaDateTime)

            //if ($param->MediaFilterMediaType == 1 && !$albumKeyExists && $cnt > 50) {
            /*
            if (mediaType == 1 && albumQuery == "" && mediaInfo.fileList.length > 50) {
                filterRec = {
                    filterName: "Winter",
                    startDate: currYear+"-01-01"
                }
                mediaInfo.filterList.push(filterRec)
                filterRec = {
                    filterName: "Spring",
                    startDate: currYear+"-04-01"
                }
                mediaInfo.filterList.push(filterRec)
                filterRec = {
                    filterName: "Summer",
                    startDate: currYear+"-07-01"
                }
                mediaInfo.filterList.push(filterRec)
                filterRec = {
                    filterName: "Fall",
                    startDate: currYear+"-10-01"
                }
                mediaInfo.filterList.push(filterRec)
                filterRec = {
                    filterName: "Winter",
                    startDate: currYear+"-12-01"
                }
                mediaInfo.filterList.push(filterRec)
            }
            */

        } // if (mediaInfo.fileList.length > 0) {

        let mti = mediaType - 1
        mediaTypeDesc = mediaTypeData[mti].MediaTypeDesc

        // Clear array before setting with values
        categoryList.length = 0

        let cnt = 0;
        if (mediaTypeData[mti].Category != null) {
            let category = null
            for (let i = 0; i < mediaTypeData[mti].Category.length; i++) {
                category = mediaTypeData[mti].Category[i]
                categoryList.push(category.CategoryName)
                cnt++
            }
        }

        contentDesc = mediaTypeDesc + " - " + queryCategory
        //contentDesc = mediaTypeDesc

        createMediaPage()
    }
}


var mediaTypeData = [
{
    id: "1",
    MediaTypeId: 1,
    MediaTypeDesc: "Photos",
    Category: [
        {
            CategoryName: "Misc",
            Menu: [
            ]
        },
        {
            CategoryName: "Easter",
            Menu: [
            ]
        },
        {
            CategoryName: "Halloween",
            Menu: [
            ]
        },
        {
            CategoryName: "Christmas",
            Menu: [
            ]
        },
        {
            CategoryName: "Projects",
            Menu: [
            ]
        },
        {
            CategoryName: "Meetings",
            Menu: [
            ]
        },
        {
            CategoryName: "ALL"
        }
    ]
},
{
    id: "2",
    MediaTypeId: 2,
    MediaTypeDesc: "Video",
    Category: [
    ]
},
{
    id: "3",
    MediaTypeId: 3,
    MediaTypeDesc: "Audio",
    Category: [
    ]
},
{
    id: "4",
    MediaTypeId: 4,
    MediaTypeDesc: "Docs",
    Category: [
        {
            CategoryName: "Governing Docs",
            Menu: [
            ]        },
        {
            CategoryName: "Historical Docs",
            Menu: [
            ]        },
        {
            CategoryName: "Quail Call newsletters",
            Menu: [
            ]        },
        {
            CategoryName: "Annual Meetings",
            Menu: [
            ]        }
    ]
}
]

