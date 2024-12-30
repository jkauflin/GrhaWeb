/*==============================================================================
(C) Copyright 2023,2024 John J Kauflin, All rights reserved.
--------------------------------------------------------------------------------
DESCRIPTION:
--------------------------------------------------------------------------------
Modification History
2023-09-08 JJK  Initial version - moved create page components to this module
--------------------------------------------------------------------------------
2024-03-29 JJK  Migrating to Azure SWA, blob storage, Cosmos DB with GraphQL
                for queries.  Also, removing Admin functions to make this just
                the presentation functions with no edit
================================================================================*/
import {empty,showLoadingSpinner} from './util.js';
import {mediaInfo,mediaType,getMenu,
    queryCategory,querySearchStr,queryMenuItem,queryAlbumKey,
    categoryList,
    contentDesc,
    queryMediaInfo,
    getFilePath,getFileName
} from './mg-data-repository.js'
import {mediaMenuCanvasId,buildMenuElements} from './mg-menu.js'
//import {mediaAlbumMenuCanvasId,buildAlbumMenuElements} from './mg-album.js'
import {displayElementInLightbox} from './mg-lightbox.js'
//import {playlistSongClass,audioPrevClass,audioNextClass,audioPlayer,setAudioListeners,
//        emptyPlaylist,incrementPlaylistIndex,addSongToPlaylist,initSong} from './mg-audio-playlist.js'

const MediaFilterRequestClass = "MediaFilterRequest";
const imgThumbnailClass = "img-thumbnail-jjk"  // Want my own thumbnail formatting instead of bootstrap border
const thumbCheckboxClass = "thumb-checkbox"

var mediaPageContainer = document.getElementById("MediaPage");
var filterContainer = document.createElement("div")
var thumbnailContainer = document.createElement("div")
var editRow1 = document.createElement("div")


var mediaAdminMessage
var mediaCategorySelect
var mediaMenuSelect
var mediaPeopleInput
var mediaPeopleSelect
var mediaPeopleList

var mediaFilterCategory
var mediaFilterStartDate
var mediaFilterSearchStr
//var mediaFilterMenuItem
//var mediaFilterAlbumTag

var mediaDetailFilename
var mediaDetailTitle
var mediaDetailTaken
var mediaDetailImg
var mediaDetailCategoryTags
var mediaDetailMenuTags
var mediaDetailAlbumTags
var mediaDetailPeopleList
var mediaDetailDescription
// NEW ones
var mediaDetailVideoList

var currIndex = 0
var currSelectAll = false

//-------------------------------------------------------------------------------------------------------
// Listen for clicks in containers
//-------------------------------------------------------------------------------------------------------
thumbnailContainer.addEventListener("click", function (event) {
    //console.log("thumbnailContainer click, classList = "+event.target.classList)

    // Check for specific classes
    if (event.target && event.target.classList.contains(MediaFilterRequestClass)) {
        // If click on a Filter Request (like Next or Prev), query the data and build the thumbnail display
        //console.log(">>> FilterRequest data-category = "+event.target.getAttribute('data-category'))
        //console.log(">>> FilterRequest data-startDate = "+event.target.getAttribute('data-startDate'))
        //console.log(">>> FilterRequest data-searchStr = "+event.target.getAttribute('data-searchStr'))
        //console.log(">>> FilterRequest data-menuItem = "+event.target.getAttribute('data-menuItem'))

        let paramData = {
            MediaFilterMediaType: mediaType, 
            getMenu: false,
            MediaFilterCategory:  event.target.getAttribute('data-category'),
            MediaFilterStartDate: event.target.getAttribute('data-startDate'),
            MediaFilterMenuItem: event.target.getAttribute('data-menuItem'),
            //MediaFilterAlbumKey: event.target.getAttribute('data-albumKey'),
            MediaFilterSearchStr: event.target.getAttribute('data-searchStr')}

        queryMediaInfo(paramData);

    } else if (event.target && event.target.classList.contains(imgThumbnailClass)) {
        event.preventDefault();
        // If clicking on a Thumbnail, bring up in Lightbox or FileDetail (for Edit mode)
        let index = parseInt(event.target.getAttribute('data-index'))
        if (typeof index !== "undefined" && index !== null) {
            displayElementInLightbox(index)
        }

    } 
})


    //-------------------------------------------------------------------------------------------------------
    // Respond to Filter requests
    //-------------------------------------------------------------------------------------------------------
    function executeFilter() {
        mediaFilterSearchStr.value = cleanInputStr(mediaFilterSearchStr.value)
        //console.log(">>> Execute Filter mediaFilterMediaType = "+mediaType)
        //console.log(">>> Execute Filter mediaFilterCategory = "+mediaFilterCategory.value)
        //console.log(">>> Filter mediaFilterStartDate = "+mediaFilterStartDate.value)
        //console.log(">>> Filter mediaFilterSearchStr = "+mediaFilterSearchStr.value)
        //console.log(">>> Filter mediaFilterMenuItem = "+mediaFilterMenuItem.value)
        //console.log(">>> Filter mediaFilterAlbumTag = "+mediaFilterAlbumTag.value)

        let paramData = {
            MediaFilterMediaType: mediaType, 
            getMenu: false,
            MediaFilterCategory:  mediaFilterCategory.value,
            MediaFilterStartDate: mediaFilterStartDate.value,
            MediaFilterSearchStr: mediaFilterSearchStr.value}

        queryMediaInfo(paramData);
        // After query has retreived data, it will kick off the display page create
    }

    var nonAlphaNumericSpaceCharsStr = "[\x01-\x1F\x21-\x2F\x3A-\x40\x5B-\x60\x7B-\x7F]";
    // "g" global so it does more than 1 substitution
    var regexNonAlphaNumericSpaceChars = new RegExp(nonAlphaNumericSpaceCharsStr, "g");
    function cleanInputStr(inStr) {
        // Remove all NON-alphanumeric or space characters
        return inStr.replace(regexNonAlphaNumericSpaceChars, '');
    }
    
    //------------------------------------------------------------------------------------------------------------
    // Dynamically create the DOM elements to add to the Media Page div (either regular display or EDIT mode)
    //------------------------------------------------------------------------------------------------------------
    export function createMediaPage() {
        //console.log("$$$$ in the createMediaPage")
        empty(filterContainer)
        empty(thumbnailContainer)
        empty(editRow1)

        if (getMenu) {
            buildMenuElements(mediaType)
            //buildAlbumMenuElements(mediaType)
        }
        buildFilterElements(mediaType)

        mediaPageContainer.appendChild(filterContainer);
        mediaPageContainer.appendChild(thumbnailContainer);

        displayCurrFileList()
    }

    export function updateAdminMessage(displayMessage) {
        if (mediaAdminMessage != null) {
            mediaAdminMessage.textContent = displayMessage
        }
    }

    //------------------------------------------------------------------------------------------------------------
    // Create a collapsible menu from a directory structure
    //------------------------------------------------------------------------------------------------------------
    function buildFilterElements(mediaType) {
        empty(filterContainer)

        // Row 1
        let filterRow1 = document.createElement("div")
        filterRow1.classList.add('row','mt-2')
        let filterRow1Col1 = document.createElement("div")
        filterRow1Col1.classList.add('col-5')


        let menuButton = document.createElement("button")
        menuButton.classList.add('btn','btn-primary','btn-sm','float-start')
        menuButton.setAttribute('type',"button")
        menuButton.setAttribute('role',"button")
        menuButton.setAttribute('data-bs-toggle', "offcanvas")
        menuButton.setAttribute('data-bs-target', mediaMenuCanvasId)
        //menuButton.textContent = "Menu"
        let icon1 = document.createElement("i")
        icon1.classList.add('fa','fa-chevron-right')
        icon1.textContent = "Menu"
        menuButton.appendChild(icon1)
        filterRow1Col1.appendChild(menuButton)

        /*
        let menuButton2 = document.createElement("button")
        menuButton2.classList.add('btn','btn-success','btn-sm','ms-2','float-start')
        menuButton2.setAttribute('type',"button")
        menuButton2.setAttribute('role',"button")
        menuButton2.setAttribute('data-bs-toggle', "offcanvas")
        menuButton2.setAttribute('data-bs-target', mediaAlbumMenuCanvasId)
        //menuButton2.textContent = "Menu"
        let iconB = document.createElement("i")
        iconB.classList.add('fa','fa-chevron-right')
        iconB.textContent = "Albums"
        menuButton2.appendChild(iconB)
        // Just display an Albums button for Photos for now (till I figure out Albums for the others)
        if (mediaType == 1) {
            filterRow1Col1.appendChild(menuButton2)
        }
        */
       
        filterRow1.appendChild(filterRow1Col1)

        //-----------------------------------------------------------------------------
        let filterRow1Col2 = document.createElement("div")
        filterRow1Col2.classList.add('col')
        // Category
        mediaFilterCategory = document.createElement("select")
        mediaFilterCategory.classList.add('form-select','float-start','shadow-none')
        let tempSelected = false
        for (let index in categoryList) {
            tempSelected = false
            if (queryCategory != null && queryCategory != "" && queryCategory != "DEFAULT") {
                if (categoryList[index] == queryCategory) {
                    tempSelected = true
                }
            } else {
                if (mediaType == 1) {
                    if (index == 1) {
                        tempSelected = true
                    }
                } else {
                    if (index == 0) {
                        tempSelected = true
                    }
                }
            }

            if (tempSelected) {
                mediaFilterCategory.options[mediaFilterCategory.options.length] = new Option(categoryList[index], categoryList[index], true, true)
            } else {
                mediaFilterCategory.options[mediaFilterCategory.options.length] = new Option(categoryList[index], categoryList[index])
            }
        }
        filterRow1Col2.appendChild(mediaFilterCategory);
        mediaFilterCategory.addEventListener("change", function () {
            executeFilter()
        });
        filterRow1.appendChild(filterRow1Col2)

        let filterRow1Col3 = document.createElement("div")
        filterRow1Col3.classList.add('col-1')
        filterRow1.appendChild(filterRow1Col3)

        //-----------------------------------------------------------------------------------------------------------------------------
        // Row 2
        let filterRow2 = document.createElement("div")
        filterRow2.classList.add('row','mt-2')
        let filterRow2Col1 = document.createElement("div")
        filterRow2Col1.classList.add('col-3','d-none','d-sm-block')

        let header2 = document.createElement("h5")
        if (contentDesc.length > 40) {
            header2 = document.createElement("h6")
        }
        //header2.textContent = mediaTypeDesc
        header2.textContent = contentDesc
        filterRow2Col1.appendChild(header2)
        filterRow2.appendChild(filterRow2Col1)

        let filterRow2Col2 = document.createElement("div")
        filterRow2Col2.classList.add('col')
        let tRow = document.createElement("div")
        tRow.classList.add('row')
        let tCol1 = document.createElement("div")
        tCol1.classList.add('col-5')
        mediaFilterStartDate = document.createElement("input")
        mediaFilterStartDate.classList.add('form-control','shadow-none')
        mediaFilterStartDate.setAttribute('type',"date")
        mediaFilterStartDate.value = mediaInfo.startDate
        tCol1.appendChild(mediaFilterStartDate);
        tRow.appendChild(tCol1)
        mediaFilterStartDate.addEventListener("change", function () {
            executeFilter()
        });

        let tCol2 = document.createElement("div")
        tCol2.classList.add('col-7')
        mediaFilterSearchStr = document.createElement("input")
        //mediaFilterSearchStr.id = "MediaFilterSearchStr"
        mediaFilterSearchStr.classList.add('form-control','shadow-none')
        mediaFilterSearchStr.setAttribute('type',"text")
        mediaFilterSearchStr.setAttribute('placeholder',"Search string")
        mediaFilterSearchStr.value = querySearchStr
        tCol2.appendChild(mediaFilterSearchStr);
        tRow.appendChild(tCol2)
        filterRow2Col2.appendChild(tRow)
        filterRow2.appendChild(filterRow2Col2)
        mediaFilterSearchStr.addEventListener("keypress", function(event) {
            // If the user presses the "Enter" key on the keyboard
            if (event.key === "Enter") {
                // Cancel the default action, if needed
                event.preventDefault();
                executeFilter()
            }
        });
    
        let filterRow2Col3 = document.createElement("div")
        filterRow2Col3.classList.add('col-2','d-none','d-sm-block')
        let header3 = document.createElement("h6")
        header3.classList.add('float-end')
        //header3.textContent = "(Edit Mode)"
        header3.textContent = ""   // >>>>>>>>>>>>>>>>>>>>>>> use if you need to display something <<<<<<<<<<<<<<<<<<<<<
        filterRow2Col3.appendChild(header3)
        filterRow2.appendChild(filterRow2Col3)

        // Add Rows to Filter Container
        filterContainer.appendChild(filterRow1);
        filterContainer.appendChild(filterRow2);
    }

    
    //===========================================================================================================
    // Display the current list image thumbnails in the thumbnail container (with appropriate class links)
    //===========================================================================================================
    export function displayCurrFileList() {
        let docFiles = false
        let audioFiles = false
        let doclistTbody = document.createElement("tbody")
        let playlistTbody = document.createElement("tbody")

        empty(thumbnailContainer)
        //emptyPlaylist()
        //let plIndex = 0

        let thumbnailRow1 = document.createElement("div")
        let thumbnailRow2 = document.createElement("div")
        let thumbnailRow3 = document.createElement("div")
        thumbnailRow1.classList.add('row')
        thumbnailRow2.classList.add('row')
        thumbnailRow3.classList.add('row')

        let thumbnailRow1Col1 = document.createElement("div")
        let thumbnailRow2Col1 = document.createElement("div")
        let thumbnailRow3Col1 = document.createElement("div")
        thumbnailRow1Col1.classList.add('col')
        thumbnailRow2Col1.classList.add('col','my-2')
        thumbnailRow3Col1.classList.add('col')

        //-------------------------------------------------------------------------------------------------------------------------
        // Loop through all the files in the current file list
        //-------------------------------------------------------------------------------------------------------------------------
        for (let index in mediaInfo.fileList) {
            let fi = mediaInfo.fileList[index]

            // Create a Card to hold the thumbnail of the media object
            let thumb = document.createElement("div")
            thumb.classList.add('card','fs-6','vh-75','float-start')

            let titleMax = 25
            if (mediaType == 1) {
                titleMax = 12
            }

            //-------------------------------------------------------------------------------------------------------------------
            // Display thumbnail according to media type (and add event links for lightbox and edit)
            //-------------------------------------------------------------------------------------------------------------------
            if (mediaType == 1) {
                let img = document.createElement("img");
                // add a class for event click
                img.classList.add('rounded','float-start','mt-2','me-2',imgThumbnailClass)
                img.setAttribute('onerror', "this.onerror=null; this.remove()")
                img.src = getFilePath(index,"Thumbs")
                //img.src = getFilePath(index,"Smaller")
                img.setAttribute('data-index', index)
                // Thumbnails are created as 130 x 130, but display is 110?
                // 2024-04-06 Testing 120, but 110 seems better
                img.height = 110

                // Make sure the 1st image is cached (for the lightbox display)
                if (index == 0) {
                    var imgCache = document.createElement('img')
                    imgCache.src = getFilePath(index,"Smaller")
                }
                thumb = img

                // *** For Testing ***
                //let videoLabel = document.createElement("label")
                //videoLabel.classList.add('mx-1')
                //videoLabel.textContent = fi.Name.substring(0,20) + " " + fi.TakenDateTime
                //thumb.appendChild(videoLabel)
                //thumb.appendChild(img)

                thumbnailRow2Col1.appendChild(thumb)

            } else if (mediaType == 2) {
                let videoLabel = document.createElement("label")
                videoLabel.classList.add('mx-1')
                if (fi.Title.length > titleMax) {
                    videoLabel.textContent = fi.Title.substring(0,titleMax)
                } else {
                    videoLabel.textContent = fi.Title
                }
                thumb.appendChild(videoLabel)

                let iframe = document.createElement("iframe")
                iframe.classList.add('m-1')
                // Use the embed link for iframe (without https so it can be run locally for testing)
                iframe.setAttribute('src', "//www.youtube.com/embed/" + fi.Name)
                iframe.setAttribute('allowfullscreen', true)

                //iframe.style.width = "230px";
                iframe.style.width = "310px";
                //iframe.style.height = "140px";
                iframe.style.height = "220px";

                thumb.appendChild(iframe)
                thumbnailRow2Col1.appendChild(thumb)
            
            /*
            } else if (mediaType == 3) {
                // MUSIC
                audioFiles = true;
                plIndex = incrementPlaylistIndex()
                addSongToPlaylist({ "title": getFileName(index), "url": getFilePath(index) })
                
                // add the table rows for the playlist
                // build a table then append to the thumbnail container
                let a = document.createElement("a")
                a.classList.add('class', `${playlistSongClass}`)
                a.setAttribute('data-plIndex', plIndex);
                a.setAttribute('role', 'button');
                a.textContent = getFileName(index)
                let td = document.createElement("td");
                td.appendChild(a);
                let tr = document.createElement("tr");
                tr.appendChild(td);
                playlistTbody.appendChild(tr)
            */
            } else if (mediaType == 4) {
                // DOCS
                    
                //console.log("PDF file = " + fi.Name + ", filePath = " + filePath);
                docFiles = true
                let a = document.createElement("a")
                a.href = getFilePath(index)
                a.setAttribute('target',"_blank");
                a.textContent = getFileName(index)
                let td = document.createElement("td");
                td.appendChild(a);
                let tr = document.createElement("tr");
                tr.classList.add("smalltext")
                tr.appendChild(td);
                doclistTbody.appendChild(tr)
            }
        } //   for (let index in mediaInfo.fileList) {
        

        // if there were any docs, build a table of the filelinks and append to the Thumbnails container\
        if (docFiles) {
            empty(thumbnailRow2Col1);

            let table = document.createElement("table");
            table.classList.add('table','table-sm')
            table.appendChild(doclistTbody)
            thumbnailRow2Col1.appendChild(table)
        }
        /*
        else if (audioFiles) {
            empty(thumbnailRow2Col1);

                // if there were any MP3's, build a player with the playlist of MP3's
                let h6 = document.createElement("h6");
                h6.id = 'SongTitle'
                h6.textContent = initSong(0)
                thumbnailRow2Col1.appendChild(h6)

                // Append the audioPlayer element
                thumbnailRow2Col1.appendChild(audioPlayer);

                let i = document.createElement("i");
                i.classList.add('fa',`${audioPrevClass}`,'fa-3x')
                let a = document.createElement("a")
                a.id = "AudioPrev"
                //a.href = "#"
                a.appendChild(i)
                thumbnailRow2Col1.appendChild(a)

                i = document.createElement("i");
                i.classList.add('fa',`${audioNextClass}`,'fa-3x','mx-3')
                a = document.createElement("a")
                a.id = "AudioNext"
                //a.href = "#"
                a.appendChild(i)
                thumbnailRow2Col1.appendChild(a)

            // append the tbody rows to the table, and the table to the Col1 (and thumbnail container)
            let playlistTable = document.createElement("table");
            playlistTable.id = 'PlaylistDisplay'
            playlistTable.classList.add('table', 'table-sm', 'mt-3')
            playlistTable.appendChild(playlistTbody)

            let row = document.createElement("div");
            row.id = 'PlaylistRow'
            row.classList.add('row')
            let col1 = document.createElement("div");
            col1.classList.add('col-sm-7')
            col1.appendChild(playlistTable)
            row.appendChild(col1)
 
            thumbnailRow2Col1.appendChild(row)
        }
        */

        //----------------------------------------------------------------------------------------------------
        // If there is a filter request list, create Filter Request buttons with the start date
        //----------------------------------------------------------------------------------------------------
        let buttonMax = 20
        if (window.innerHeight > window.innerWidth) {
            buttonMax = 4
        }

        if (mediaInfo.filterList != null) {
            let buttonColor = 'btn-primary'
            for (let index in mediaInfo.filterList) {
                if (index > buttonMax) {
                    continue
                }
                let FilterRec = mediaInfo.filterList[index]

                buttonColor = 'btn-primary'
                if (FilterRec.filterName == 'Winter') {
                    buttonColor = 'btn-secondary'
                } else if (FilterRec.filterName == 'Spring') {
                    buttonColor = 'btn-success'
                } else if (FilterRec.filterName == 'Summer') {
                    buttonColor = 'btn-danger'
                } else if (FilterRec.filterName == 'Fall') {
                    buttonColor = 'btn-warning'
                }

                let button = document.createElement("button")
                button.setAttribute('type',"button")
                button.setAttribute('role',"button")
                button.setAttribute('data-MediaType', mediaType)
                button.setAttribute('data-category', mediaFilterCategory.value)
                button.setAttribute('data-startDate', FilterRec.startDate)
                button.setAttribute('data-menuItem', queryMenuItem)
                //button.setAttribute('data-albumKey', queryAlbumKey)
                button.setAttribute('data-searchStr', querySearchStr)
                button.classList.add('btn',buttonColor,'btn-sm','shadow-none','me-2','my-2',MediaFilterRequestClass)
                button.textContent = FilterRec.filterName
                thumbnailRow1Col1.appendChild(button)

                // If too many thumbnails, duplicate button at the bottom
                if (mediaInfo.fileList.length > 50) {
                    let button2 = document.createElement("button")
                    button2.setAttribute('type',"button")
                    button2.setAttribute('role',"button")
                    button2.setAttribute('data-MediaType', mediaType)
                    button2.setAttribute('data-category', mediaFilterCategory.value)
                    button2.setAttribute('data-startDate', FilterRec.startDate)
                    button2.setAttribute('data-menuItem', queryMenuItem)
                    //button2.setAttribute('data-albumKey', queryAlbumKey)
                    button2.setAttribute('data-searchStr', querySearchStr)
                    button2.classList.add('btn',buttonColor,'btn-sm','shadow-none','me-2','my-2',MediaFilterRequestClass)
                    button2.textContent = FilterRec.filterName
                    thumbnailRow3Col1.appendChild(button2)
                }
            }
            if (mediaType == 1 && mediaInfo.fileList.length > 50) {
                let buttonTop = document.createElement("button")
                buttonTop.setAttribute('type',"button")
                buttonTop.setAttribute('role',"button")
                buttonTop.classList.add('btn','btn-primary','btn-sm','shadow-none','me-2','my-2')
                buttonTop.textContent = "Top"
                thumbnailRow3Col1.appendChild(buttonTop)
                buttonTop.addEventListener("click", function () {
                    window.scrollTo(0, 0)
                });
            }
        }

        // Add the Menu or Album name as row 0 (if it is non-blank)
        if (mediaInfo.menuOrAlbumName != null && mediaInfo.menuOrAlbumName != "") {
            let thumbnailRow0 = document.createElement("div")
            thumbnailRow0.classList.add('row')
            let thumbnailRow0Col1 = document.createElement("div")
            thumbnailRow0Col1.classList.add('col','mt-2','ms-1')
            let headerText = document.createElement("h6");
            headerText.textContent = mediaInfo.menuOrAlbumName
            thumbnailRow0Col1.appendChild(headerText)
            thumbnailRow0.appendChild(thumbnailRow0Col1)
            thumbnailContainer.appendChild(thumbnailRow0)
        }

        thumbnailRow1.appendChild(thumbnailRow1Col1)
        thumbnailRow2.appendChild(thumbnailRow2Col1)
        thumbnailRow3.appendChild(thumbnailRow3Col1)
        thumbnailContainer.appendChild(thumbnailRow1)
        thumbnailContainer.appendChild(thumbnailRow2)
        thumbnailContainer.appendChild(thumbnailRow3)
    }

