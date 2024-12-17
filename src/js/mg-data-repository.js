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
                do GraphQL queries with "gte" on TakenFileTime integer,
                contains on strings, orderBy on Taken, and first maxRows
2024-06-20 JJK  Getting an error from Azure on the MediaType query, so I've
                hard-coded the categories and menu items for now
================================================================================*/

import {createMediaPage,displayCurrFileList,updateAdminMessage} from './mg-create-pages.js';
import {setMenuList} from './mg-menu.js';
import {setAlbumList,getAlbumName} from './mg-album.js';
export let mediaInfo = {
    menuList: [],
    filterList: [],
    fileList: [],
    startDate: "",
    menuOrAlbumName: ""}
export let mediaType = 1
export let mediaTypeDesc = "Photos"
export let contentDesc = ""
export var getMenu = false

export var queryCategory = ""
export var querySearchStr = ""
export var queryMenuItem = ""
export var queryAlbumKey = ""

export var categoryList = []
let defaultCategory = "1 John J Kauflin"

// Look into using environment variables for this (like secrets for Azure credentials)
let photosUri = "https://jjkwebstorage.blob.core.windows.net/photos/"
let thumbsUri = "https://jjkwebstorage.blob.core.windows.net/thumbs/"
let musicUri = "https://jjkwebstorage.blob.core.windows.net/music/"


export function setMediaType(inMediaType) {
    mediaType = parseInt(inMediaType)
}

export function getFilePath(index,descMod="",fullPath=false) {
    // descMod could be "Thumbs" or "Smaller"
    let fi = mediaInfo.fileList[index]

    if (mediaType == 3) {
        return musicUri + fi.Name
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

function addDays(inDate, days) {
    let td = new Date(inDate)
    td.setDate(td.getDate() + (parseInt(days)+1))
    /*
    let tempMonth = td.getMonth() + 1
    let tempDay = td.getDate()
    let outDate = td.getFullYear() + '-' + paddy(tempMonth,2) + '-' + paddy(tempDay,2)
    */
    /*
    const dateTimeFormatOptions = {
        //timeZone: "Africa/Accra",
        //hour12: true,
        //hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    };
    */
    //return tempDate.toLocaleTimeString("en-US", dateTimeFormatOptions)
    //return outDate;
    //return tempDate.toLocaleDateString("en-US", dateTimeFormatOptions)
    //return td.toLocaleDateString()
    return td.toISOString().substring(0,10)  //2024-01-31T19:37:12.291Z
}
 
function paddy(num, padlen, padchar) {
    var pad_char = typeof padchar !== 'undefined' ? padchar : '0'
    var pad = new Array(1 + padlen).join(pad_char)
    return (pad + num).slice(-pad.length)
}

// Return an integer of the date + hours (2024123101)
export function getDateInt(inDateStr) {
    /*
    let td = new Date()
    if (inDate != null) {
        td = inDate
    }
    let tempMonth = td.getMonth() + 1
    let tempDay = td.getDate()
    let formattedDate = td.getFullYear() + paddy(tempMonth,2) + paddy(tempDay,2) + paddy(td.getHours(),2)
    */

    let formattedDate = "1800-01-01 00:00:00"
    if (inDateStr != null) {
        if (inDateStr.length >= 13) {
            formattedDate = inDateStr.substring(0,4) + inDateStr.substring(5,7) + inDateStr.substring(8,10) + inDateStr.substring(11,13)
        } else {
            formattedDate = inDateStr.substring(0,4) + inDateStr.substring(5,7) + inDateStr.substring(8,10) + "00"
        }
    }

    return(parseInt(formattedDate))
}

//------------------------------------------------------------------------------------------------------------
// Query the database for menu and file information and store in js variables
//------------------------------------------------------------------------------------------------------------
export async function queryMediaInfo(paramData) {
    //console.log(">>>>> in the QueryMediaInfo, paramData.MediaFilterMediaType = "+paramData.MediaFilterMediaType)
    //console.log("--------------------------------------------------------------------")
    //console.log("$$$$$ in the QueryMediaInfo, mediaType = "+mediaType)

    getMenu = paramData.getMenu
    //getMenu = false

    // Set a default start date of 60 days back from current date
    mediaInfo.menuOrAlbumName = ""

    if (mediaType == 1) {
        mediaInfo.startDate = addDays(new Date(), -60)
    } else {
        mediaInfo.startDate = "1800-01-01"
    }

    //let maxRows = 200
    let maxRows = 100
    if (mediaType == 2) {
		//maxRows = 18
		maxRows = 12
    }

    // When getMenu specified, query the MediaType container for menu values (first page load)
    let mediaTypeQuery = ""
    if (getMenu) {
        // loading...
        //setThumbnailMessage("Loading...")
        /*
        mtype_by_pk(id: ${mediaType.toString()}) {
            id
            MediaTypeDesc
            Category {
                CategoryName
                Menu {
                    MenuItem
                }
            }
        }
        */
        mediaTypeQuery = `
        malbums 
        {
            items {
                AlbumKey
                AlbumName
            }
        }
        `
    }

/*
type Malbum @model {
  id: ID
  MediaAlbumId: Int
  AlbumKey: String
  AlbumName: String
  AlbumDesc: String
}
*/

    let categoryQuery = ""
    if (paramData.MediaFilterCategory != null && paramData.MediaFilterCategory != '' &&
        paramData.MediaFilterCategory != 'ALL' && paramData.MediaFilterCategory != '0') {
        if (paramData.MediaFilterCategory == 'DEFAULT') {
            categoryQuery = `{ CategoryTags: {contains: "${defaultCategory}"} }`
        } else {
            let tempCategory = paramData.MediaFilterCategory
            let pos = 0
            pos = paramData.MediaFilterCategory.indexOf(" Family")
            if (pos > -1) {
                tempCategory = paramData.MediaFilterCategory.substring(0,pos)
            }
            pos = paramData.MediaFilterCategory.indexOf(" family")
            if (pos > -1) {
                tempCategory = paramData.MediaFilterCategory.substring(0,pos)
            }

            categoryQuery = `{ CategoryTags: {contains: "${tempCategory}"} }`
        }
        //console.log(">>> categoryQuery = "+categoryQuery)
    }

    let startDateQuery = ""
    //console.log("paramData.MediaFilterStartDate = "+paramData.MediaFilterStartDate)
	if (paramData.MediaFilterStartDate != null && paramData.MediaFilterStartDate != '') {
		if (paramData.MediaFilterStartDate == "DEFAULT") {
			paramData.MediaFilterStartDate = mediaInfo.startDate
		}
        //console.log("      int MediaFilterStartDate = "+getDateInt(paramData.MediaFilterStartDate))
		//if (paramData.MediaFilterStartDate != "0001-01-01 00:00:00") {
        if (paramData.MediaFilterStartDate != "1800-01-01") {
            //startDateQuery = `{ TakenFileTime: { gte: 2023010108 } }`
            startDateQuery = `{ TakenFileTime: { gte: ${getDateInt(paramData.MediaFilterStartDate)} } }`
        }
        //console.log(">>> startDateQuery = "+startDateQuery)
	}

    let menuQuery = ""
    if (paramData.MediaFilterMenuItem != null && paramData.MediaFilterMenuItem != '') {
        // Maybe add Category to this (if needed)
        mediaInfo.menuOrAlbumName = paramData.MediaFilterMenuItem
        menuQuery = `{ MenuTags: {contains: "${paramData.MediaFilterMenuItem}"} }`
        //console.log(">>> menuQuery = "+menuQuery)
	}
    
    let albumQuery = ""
    if (paramData.MediaFilterAlbumKey != null && paramData.MediaFilterAlbumKey != '') {
        if (paramData.MediaFilterAlbumName != null && paramData.MediaFilterAlbumName != '') {
            mediaInfo.menuOrAlbumName = paramData.MediaFilterAlbumName
        }
        albumQuery = `{ AlbumTags: {contains: "${paramData.MediaFilterAlbumKey}"} }`
        //console.log(">>> albumQuery = "+albumQuery)
	}

    let searchQuery = ""
    if (paramData.MediaFilterSearchStr != null && paramData.MediaFilterSearchStr != '') {
        searchQuery = `{ SearchStr: {contains: "${paramData.MediaFilterSearchStr.toLowerCase()}"} }`
        // If search is specified, clear out the category and start date queries
        categoryQuery = ""
        startDateQuery = ""
        //console.log(">>> searchQuery = "+searchQuery)
	}

    let orderBy = "orderBy: { TakenDateTime: ASC }"
    /*
    if (mediaType == 2) {
        orderBy = "orderBy: { Name: ASC }"
    }
    */

/*
  id: ID
  MediaTypeId: Int
  Name: String
  TakenDateTime: String
  TakenFileTime: Float
  CategoryTags: String
  MenuTags: String
  AlbumTags: String
  Title: String
  Description: String
  People: String
  ToBeProcessed: Boolean
  SearchStr: String
*/
    let gql = `query {
            books(
                filter: { 
                    and: [ 
                        { MediaTypeId: { eq: ${mediaType} } }
                        ${categoryQuery}
                        ${menuQuery}
                        ${albumQuery}
                        ${searchQuery}
                        ${startDateQuery}
                    ] 
                },
                ${orderBy},
                first: ${maxRows}
            ) {
                items {
                    Name
                    TakenDateTime
                    Title
                }
            }
            ${mediaTypeQuery}
        }`

    //console.log(">>> query gql = "+gql)

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
        //console.table(result.data.mtypes.items);
        /*
        console.log("items[0].Category[1].CategoryName = "+result.data.mtypes.items[0].Category[1].CategoryName);
        console.log("items[0].Category[1].Menu = "+result.data.mtypes.items[0].Category[1].Menu);
        console.log("items[0].Category[1].Menu[0].MenuItem = "+result.data.mtypes.items[0].Category[1].Menu[0].MenuItem);
        */
        //console.table(result.data.books.items);
        //console.table(result.data.book_by_pk);
        //console.log("Title = "+result.data.book_by_pk.Title)
        //console.table(result.data.mtype_by_pk);
        /*
        console.log("data.mtype_by_pk.MediaTypeDesc = "+result.data.mtype_by_pk.MediaTypeDesc);
        console.log("data.mtype_by_pk.Category[0].CategoryName = "+result.data.mtype_by_pk.Category[0].CategoryName);
        if (result.data.mtype_by_pk.Category[0].Menu != null) {
            console.log("data.mtype_by_pk.Category[0].Menu[0].MenuItem = "+result.data.mtype_by_pk.Category[0].Menu[0].MenuItem);
        }
        */
        mediaInfo.fileList.length = 0
        mediaInfo.fileList = result.data.books.items
        mediaInfo.filterList = []

        if (mediaInfo.fileList.length > 0) {
            mediaInfo.startDate = mediaInfo.fileList[0].TakenDateTime.substring(0,10)

            // Set the filter list elements
            let currYear = mediaInfo.startDate.substring(0,4)
            let lastTakenDateTime = mediaInfo.fileList[result.data.books.items.length-1].TakenDateTime

            let prevYear = parseInt(mediaInfo.startDate.substring(0,4))-1
            let filterRec = {
                filterName: "Prev Year",
                startDate: prevYear.toString()+"-01-01"
            }
            mediaInfo.filterList.push(filterRec)
        
            filterRec = {
                filterName: "Next",
                startDate: lastTakenDateTime
            }
            mediaInfo.filterList.push(filterRec)
            console.log("Next, startDate: lastTakenDateTime = "+lastTakenDateTime)

            //if ($param->MediaFilterMediaType == 1 && !$albumKeyExists && $cnt > 50) {
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

        } // if (mediaInfo.fileList.length > 0) {

        /*
        if (mediaInfo.currMenu != null && mediaInfo.currMenu != "") {
            contentDesc = mediaTypeDesc + " - " + mediaInfo.currMenu
        } else if (mediaInfo.currAlbum != null && mediaInfo.currAlbum != "") {
            contentDesc = mediaTypeDesc + " - " + mediaInfo.currAlbum
        }
        */

        if (getMenu) {
            //mediaTypeDesc = result.data.mtype_by_pk.MediaTypeDesc
            let mti = mediaType - 1
            mediaTypeDesc = mediaTypeData[mti].MediaTypeDesc
            contentDesc = mediaTypeDesc

            // Clear array before setting with values
            mediaInfo.menuList.length = 0
            categoryList.length = 0

            let cnt = 0;
            if (mediaTypeData[mti].Category != null) {
                let category = null
                for (let i = 0; i < mediaTypeData[mti].Category.length; i++) {
                    category = mediaTypeData[mti].Category[i]
                    categoryList.push(category.CategoryName)
                    cnt++
                    if (mediaType == 1) {
                        if (cnt == 2) {
                            defaultCategory = category.CategoryName
                        }
                    } else {
                        if (cnt == 1) {
                            defaultCategory = category.CategoryName
                        }
                    }
    
                    let menuObject = 
                    {
                        category: category.CategoryName,
                        subMenuList: category.Menu
                    }
    
                    mediaInfo.menuList.push(menuObject)
                }

                //mediaTypeData[mti].Category.length
                /*
                mediaTypeData[mti].Category.forEach((category) => {
                    categoryList.push(category.CategoryName)
    
                    let menuObject = 
                    {
                        category: category.CategoryName,
                        subMenuList: category.Menu
                    }
    
                    mediaInfo.menuList.push(menuObject)
                })
                */
            }

            // Save the menu lists
            setMenuList(mediaInfo.menuList)
            setAlbumList(result.data.malbums.items)
        }

        // Save the parameters from the laste query
        queryCategory = paramData.MediaFilterCategory
        querySearchStr = ""
        if (paramData.MediaFilterSearchStr != null && paramData.MediaFilterSearchStr != "") {
            querySearchStr = paramData.MediaFilterSearchStr
        }
        queryMenuItem = ""
        if (paramData.MediaFilterMenuItem != null & paramData.MediaFilterMenuItem != "") {
            queryMenuItem = paramData.MediaFilterMenuItem
        }
        queryAlbumKey = ""
        if (paramData.MediaFilterAlbumKey != null & paramData.MediaFilterAlbumKey != "") {
            queryAlbumKey = paramData.MediaFilterAlbumKey
            // Get the Album Name if not included
            if (mediaInfo.menuOrAlbumName == "") {
                mediaInfo.menuOrAlbumName = getAlbumName(queryAlbumKey)
            }
        }

        //MediaFilterAlbumKey
        //queryAlbumKey

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
            CategoryName: "ALL"
        },
        {
            CategoryName: "1 John J Kauflin",
            Menu: [
                {
                    MenuItem: "1987-to-1993"
                },
                {
                    MenuItem: "1994-to-2001"
                },
                {
                    MenuItem: "2002-to-2008"
                },
                {
                    MenuItem: "2009-to-2015"
                },
                {
                    MenuItem: "2016-to-2022"
                },
                {
                    MenuItem: "2023-to-2029"
                },
                {
                    MenuItem: "GRHA"
                },
                {
                    MenuItem: "LexisNexis"
                },
                {
                    MenuItem: "Navistar"
                }
            ]
        },
        {
            CategoryName: "2 John E Kauflin",
            Menu: [
                {
                    MenuItem: "1940-to-1966"
                },
                {
                    MenuItem: "1966 Portrait album"
                },
                {
                    MenuItem: "1967-to-1972"
                },
                {
                    MenuItem: "1973-to-1976"
                },
                {
                    MenuItem: "1977-to-1979"
                },
                {
                    MenuItem: "1980-to-1982"
                },
                {
                    MenuItem: "1981-to-1984-remodeling"
                },
                {
                    MenuItem: "1983-to-1985"
                },
                {
                    MenuItem: "1986-to-1988"
                },
                {
                    MenuItem: "1989-to-1991"
                },
                {
                    MenuItem: "1992-to-1994"
                },
                {
                    MenuItem: "2000-to-2004"
                },
                {
                    MenuItem: "2005-to-2009"
                },
                {
                    MenuItem: "2010-to-2016"
                },
                {
                    MenuItem: "2017 KI Whistling Straights"
                },
                {
                    MenuItem: "2017-to-present"
                },
                {
                    MenuItem: "2024-to-present"
                }
            ]
        },
        {
            CategoryName: "3 Baker Family",
            Menu: [
                {
                    MenuItem: "1915-to-1959"
                },
                {
                    MenuItem: "1960-to-1999"
                },
                {
                    MenuItem: "2000-to-2006"
                },
                {
                    MenuItem: "2006-10-16 Martha funeral"
                },
                {
                    MenuItem: "2007-12-09 Sarah Pfouts wedding"
                },
                {
                    MenuItem: "2008-to-2014"
                },
                {
                    MenuItem: "2013-10-18 Baker reunion"
                },
                {
                    MenuItem: "2015-12-24 Bill Pfouts"
                },
                {
                    MenuItem: "2016-Present"
                }
            ]
        },
        {
            CategoryName: "4 Mann Family",
            Menu: [
                {
                    MenuItem: "1970-to-1999"
                },
                {
                    MenuItem: "2000-to-2003"
                },
                {
                    MenuItem: "2003-06-23-Stephen-wedding"
                },
                {
                    MenuItem: "2004-to-2006"
                },
                {
                    MenuItem: "2008-Stephen"
                },
                {
                    MenuItem: "2009-08-22-Reunion"
                },
                {
                    MenuItem: "2010-07-11-Ben-and-Jaquata"
                },
                {
                    MenuItem: "2011-05-02-Easter"
                },
                {
                    MenuItem: "2011-12-25-Christmas"
                },
                {
                    MenuItem: "2012-to-present"
                }
            ]
        },
        {
            CategoryName: "5 Bands",
            Menu: [
                {
                    MenuItem: "Band Parties"
                },
                {
                    MenuItem: "John J Kauflin"
                },
                {
                    MenuItem: "Phil N The Blanks"
                },
                {
                    MenuItem: "Something Else"
                },
                {
                    MenuItem: "The Crunge"
                },
                {
                    MenuItem: "The Midnight Ramblers"
                },
                {
                    MenuItem: "The Mortar Shells"
                },
                {
                    MenuItem: "Van Kauflin"
                }
            ]
        },
        {
            CategoryName: "Mementos",
            Menu: [
                {
                    MenuItem: "Albums"
                },
                {
                    MenuItem: "Equipment"
                },
                {
                    MenuItem: "JohnBot"
                },
                {
                    MenuItem: "Kids artwork"
                },
                {
                    MenuItem: "Micronauts"
                },
                {
                    MenuItem: "Misc"
                },
                {
                    MenuItem: "Wacky Packages"
                }
            ]
        },
        {
            CategoryName: "Misc",
            Menu: [
                {
                    MenuItem: "Art"
                },
                {
                    MenuItem: "Famous People"
                },
                {
                    MenuItem: "Funny"
                },
                {
                    MenuItem: "History"
                },
                {
                    MenuItem: "Music People"
                },
                {
                    MenuItem: "Nature"
                }
            ]
        }
    ]
},
{
    id: "2",
    MediaTypeId: 2,
    MediaTypeDesc: "Videos",
    Category: [
        {
            CategoryName: "1 John J Kauflin",
            Menu: [
                {
                    MenuItem: "1995-2004"
                },
                {
                    MenuItem: "2005-2009"
                },
                {
                    MenuItem: "2010-2015"
                },
                {
                    MenuItem: "2016-2019"
                },
                {
                    MenuItem: "2020-2025"
                }
            ]
        },
        {
            CategoryName: "2 John E Kauflin",
            Menu: [
                {
                    MenuItem: "1964-1967 Home Movies"
                },
                {
                    MenuItem: "1968-1972 Home Movies"
                },
                {
                    MenuItem: "1973-1983 Home Movies"
                },
                {
                    MenuItem: "2009"
                }
            ]
        },
        {
            CategoryName: "3 Baker family",
            Menu: [
                {
                    MenuItem: "Misc"
                }
            ]
        },
        {
            CategoryName: "4 Mann family",
            Menu: [
                {
                    MenuItem: "Misc"
                }
            ]
        },
        {
            CategoryName: "5 Van Kauflin",
            Menu: [
                {
                    MenuItem: "2012 Play With Me film"
                },
                {
                    MenuItem: "2018 Von Kauflin"
                },
                {
                    MenuItem: "2020-03 Practice"
                },
                {
                    MenuItem: "2021-11 Thanksgiving practice"
                },
                {
                    MenuItem: "2021-12 Winterfest"
                },
                {
                    MenuItem: "2023-05 Basement Party"
                }
            ]
        },
        {
            CategoryName: "6 The Crunge",
            Menu: [
                {
                    MenuItem: "Misc"
                }
            ]
        },
        {
            CategoryName: "7 Something Else",
            Menu: [
                {
                    MenuItem: "1992 Rich Lamb jam"
                },
                {
                    MenuItem: "1992 The Richey tape"
                },
                {
                    MenuItem: "1992-03 Practice"
                },
                {
                    MenuItem: "1994 Oregon Express"
                },
                {
                    MenuItem: "1997-02 Practice"
                },
                {
                    MenuItem: "1997-05 Practice"
                },
                {
                    MenuItem: "1998 Live with Sean B"
                },
                {
                    MenuItem: "2000 New Years jam"
                },
                {
                    MenuItem: "2001 Solstice jam"
                },
                {
                    MenuItem: "2003 2003-to-2006"
                },
                {
                    MenuItem: "2004-09 Practice"
                },
                {
                    MenuItem: "2004-2006"
                },
                {
                    MenuItem: "2007 Solstice party"
                },
                {
                    MenuItem: "2008-09 Rockfest 6"
                },
                {
                    MenuItem: "2012-09 Rockfest 10"
                }
            ]
        },
        {
            CategoryName: "8 Midnight Ramblers",
            Menu: [
                {
                    MenuItem: "Misc"
                }
            ]
        },
        {
            CategoryName: "9 Navistar",
            Menu: [
                {
                    MenuItem: "Misc"
                }
            ]
        },
        {
            CategoryName: "10 Nerdvana",
            Menu: [
                {
                    MenuItem: "2023-06 IT Summer Fest"
                },
                {
                    MenuItem: "2023-11 Practice for Xmas"
                },
                {
                    MenuItem: "2023-12 IT Xmas party at HQ"
                }
            ]
        }
    ]
},
{
    id: "3",
    MediaTypeId: 3,
    MediaTypeDesc: "Music",
    Category: [
        {
            CategoryName: "John Kauflin",
            Menu: [
                {
                    MenuItem: "(1985) Final Mixes 1"
                },
                {
                    MenuItem: "(1986) Final Mixes 2"
                },
                {
                    MenuItem: "(1987) Final Mixes 3"
                },
                {
                    MenuItem: "(1988) Final Mixes 4"
                },
                {
                    MenuItem: "(1988) Final Mixes 5"
                },
                {
                    MenuItem: "(1989) Final Mixes 6"
                },
                {
                    MenuItem: "(1990) Final Mixes 7"
                },
                {
                    MenuItem: "(1993) Final Mixes 11"
                },
                {
                    MenuItem: "(2003) Voices in my head"
                },
                {
                    MenuItem: "(2014-12) Winterfest acoustic set"
                },
                {
                    MenuItem: "(2019-08-31) John Kauflin at Rockfest"
                }
            ]
        },
        {
            CategoryName: "Van Kauflin",
            Menu: [
                {
                    MenuItem: "(2018-12) Von Kauflin at Winterfest"
                },
                {
                    MenuItem: "(2019-05-25) Van Kauflin Live"
                },
                {
                    MenuItem: "(2020-02-16) Demos"
                }
            ]
        },
        {
            CategoryName: "Something Else",
            Menu: [
                {
                    MenuItem: "(1991-05-25) SE practice"
                },
                {
                    MenuItem: "(1992) Something Else"
                },
                {
                    MenuItem: "(1997) I hate things that suck"
                },
                {
                    MenuItem: "(1998) Live 1992 to 1994 (Disc 1)"
                },
                {
                    MenuItem: "(1998) Live 1992 to 1994 (Disc 2)"
                },
                {
                    MenuItem: "(1998) Live 1992 to 1994 (Disc 3)"
                },
                {
                    MenuItem: "(2001-04-11) Last practice at 2621"
                },
                {
                    MenuItem: "(2005-09) Rockfest"
                },
                {
                    MenuItem: "(2006) Best of 1996 to 2006"
                },
                {
                    MenuItem: "(2012-09) Rockfest X"
                },
                {
                    MenuItem: "(2014-09) Rockfest"
                },
                {
                    MenuItem: "(2015-12) Winterfest"
                },
                {
                    MenuItem: "(2016-09) Rockfest"
                },
                {
                    MenuItem: "(2017-12) Winterfest"
                }
            ]
        },
        {
            CategoryName: "The Crunge",
            Menu: [
                {
                    MenuItem: "(1989) Basement Tape 89"
                },
                {
                    MenuItem: "(1990) Crunge demos"
                },
                {
                    MenuItem: "(1990) The Crunge (Live)"
                }
            ]
        },
        {
            CategoryName: "The Midnight Ramblers",
            Menu: [
                {
                    MenuItem: "(1985-08-13) The Seventh Sons"
                },
                {
                    MenuItem: "(1986-01-03) Live at Canal Street Tavern"
                },
                {
                    MenuItem: "(1986-06) Practice at Willowwood (w-Paul)"
                },
                {
                    MenuItem: "(1986-07) Practice for Dayton Band Playoffs"
                },
                {
                    MenuItem: "(1986-08-06) Day before McGuffys Pub"
                },
                {
                    MenuItem: "(1986-12) Jam to the world (session)"
                },
                {
                    MenuItem: "(1986-12-03) Practice at Willowwood"
                },
                {
                    MenuItem: "(1987-03) Practice (w-Carl)"
                },
                {
                    MenuItem: "(1987-06-22) Live at Plumberland"
                },
                {
                    MenuItem: "(1988) Off to Iowa session"
                },
                {
                    MenuItem: "(1988-03-26) Show for Jim"
                },
                {
                    MenuItem: "(1988-10-30) Halloween Demo Jam"
                },
                {
                    MenuItem: "(1988-11-12) Demo Night 2"
                },
                {
                    MenuItem: "(1988-11-14) Best of Demo Jams"
                },
                {
                    MenuItem: "(2017-12) Winterfest"
                }
            ]
        },
        {
            CategoryName: "Phil N the Blanks",
            Menu: [
                {
                    MenuItem: "(1984-06-01) Live in the basement"
                }
            ]
        },
        {
            CategoryName: "The Mortar Shells",
            Menu: [
                {
                    MenuItem: "(1980) Jamming in the basement"
                }
            ]
        },
        {
            CategoryName: "Richard Baker",
            Menu: [
                {
                    MenuItem: "(1983) Obscure Songs"
                }
            ]
        },
        {
            CategoryName: "Aftermath",
            Menu: [
                {
                    MenuItem: "(1989) Vocal Sessions"
                }
            ]
        },
        {
            CategoryName: "The Wise Fools",
            Menu: [
                {
                    MenuItem: "(1996) Demo Session"
                }
            ]
        },
        {
            CategoryName: "Blues Coalition",
            Menu: [
                {
                    MenuItem: "(1999) Complete Sessions"
                },
                {
                    MenuItem: "(1999) Complete Sessions 2"
                }
            ]
        }
    ]
},
{
    id: "4",
    MediaTypeId: 4,
    MediaTypeDesc: "Docs"
}
]
