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
2025-01-05 JJK  Added handling of doc class to return PDF data
2025-10-10 JJK  Modified to handle new file list data from API query
================================================================================*/
import {empty,showLoadingSpinner} from './util.js';
import {mediaInfo,mediaType,queryCategory,categoryList,contentDesc,queryMediaInfo,getFilePath,getFileName} from './mg-data-repository.js'
import {displayElementInLightbox} from './mg-lightbox.js'

const MediaFilterRequestClass = "MediaFilterRequest";
const imgThumbnailClass = "img-thumbnail-jjk"  // Want my own thumbnail formatting instead of bootstrap border
const thumbCheckboxClass = "thumb-checkbox"

// This media gallery library counts on a "MediaPage" main element being define
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

        let paramData = {
            MediaFilterMediaType: mediaType, 
            MediaFilterCategory:  event.target.getAttribute('data-category'),
            MediaFilterStartDate: event.target.getAttribute('data-startDate')
        }

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
        //console.log(">>> Execute Filter mediaFilterMediaType = "+mediaType)
        //console.log(">>> Execute Filter mediaFilterCategory = "+mediaFilterCategory.value)
        //console.log(">>> Filter mediaFilterStartDate = "+mediaFilterStartDate.value)

        let paramData = {
            MediaFilterMediaType: mediaType, 
            MediaFilterCategory:  mediaFilterCategory.value,
            MediaFilterStartDate: mediaFilterStartDate.value}

        queryMediaInfo(paramData);
        // After query has retreived data, it will kick off the display page create
    }

    //------------------------------------------------------------------------------------------------------------
    // Dynamically create the DOM elements to add to the Media Page div (either regular display or EDIT mode)
    //------------------------------------------------------------------------------------------------------------
    export function createMediaPage() {
        //console.log("$$$$ in the createMediaPage")
        empty(filterContainer)
        empty(thumbnailContainer)
        empty(editRow1)

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

        //-----------------------------------------------------------------------------
        let filterRow1Col1 = document.createElement("div")
        filterRow1Col1.classList.add('col-sm-6','col-md-5')
        let header2 = document.createElement("h5")
        if (contentDesc.length > 40) {
            header2 = document.createElement("h6")
        }
        header2.textContent = contentDesc
        filterRow1Col1.appendChild(header2)
        filterRow1.appendChild(filterRow1Col1)

        //-----------------------------------------------------------------------------
        let filterRow1Col2 = document.createElement("div")
        filterRow1Col2.classList.add('col-sm-4','col-md-3')
        filterRow1.appendChild(filterRow1Col2)

        //-----------------------------------------------------------------------------
        let filterRow1Col3 = document.createElement("div")
        filterRow1Col3.classList.add('col-1')
        filterRow1.appendChild(filterRow1Col3)

        //-----------------------------------------------------------------------------------------------------------------------------
        // Row 2
        let filterRow2 = document.createElement("div")
        filterRow2.classList.add('row','mt-2')
        let filterRow2Col1 = document.createElement("div")
        //filterRow2Col1.classList.add('col-3','d-none','d-sm-block')
        filterRow2Col1.classList.add('col-sm-4','col-md-3')

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
                if (index == 0) {
                    tempSelected = true
                }
            }

            if (tempSelected) {
                mediaFilterCategory.options[mediaFilterCategory.options.length] = new Option(categoryList[index], categoryList[index], true, true)
            } else {
                mediaFilterCategory.options[mediaFilterCategory.options.length] = new Option(categoryList[index], categoryList[index])
            }
        }
        mediaFilterCategory.addEventListener("change", function () {
            executeFilter()
        });
        filterRow2Col1.appendChild(mediaFilterCategory);
        filterRow2.appendChild(filterRow2Col1)

        /*
<div class="dropdown">
  <a class="btn btn-secondary dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
    Dropdown link
  </a>

  <ul class="dropdown-menu">
    <li><a class="dropdown-item" href="#">Action</a></li>
    <li><a class="dropdown-item" href="#">Another action</a></li>
    <li><a class="dropdown-item" href="#">Something else here</a></li>
  </ul>
</div>

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
        */
        mediaFilterStartDate = document.createElement("input")
        mediaFilterStartDate.setAttribute('type',"date")
        mediaFilterStartDate.value = mediaInfo.startDate

        // Add Rows to Filter Container
        filterContainer.appendChild(filterRow1);
        filterContainer.appendChild(filterRow2);
    }

    
    //===========================================================================================================
    // Display the current list image thumbnails in the thumbnail container (with appropriate class links)
    //===========================================================================================================
    export function displayCurrFileList() {
        let docFiles = false
        let doclistTbody = document.createElement("tbody")

        empty(thumbnailContainer)

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
        let prevYear = ""
        let currYear = ""
        for (let index in mediaInfo.fileList) {
            let fi = mediaInfo.fileList[index]
            //console.log("fi.mediaDateTime = " + fi.mediaDateTime);
            //let prevYear = parseInt(mediaInfo.startDate.substring(0,4))-1

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
                currYear = fi.mediaDateTime.substring(0,4)
                if (currYear != prevYear) {

                    //<div class="clearfix">...</div>

                    /*
    <!-- Force next columns to break to new line -->
    <div class="w-100"></div>
                    */
                    let cf = document.createElement("div")
                    cf.classList.add('clearfix')
                    thumbnailRow2Col1.appendChild(cf)

                    let yearHeader = document.createElement("b")
                    yearHeader.classList.add('clearfix','m-0','p-0')
                    yearHeader.textContent = currYear
                    thumbnailRow2Col1.appendChild(yearHeader)
                    thumbnailRow2Col1.appendChild(yearHeader)
                }
                prevYear = currYear

                let img = document.createElement("img");
                // add a class for event click
                img.classList.add('rounded','float-start','mt-2','me-2',imgThumbnailClass)
                img.setAttribute('onerror', "this.onerror=null; this.remove()")
                img.src = getFilePath(index,"Thumbs")
                img.setAttribute('data-index', index)
                img.height = 110

                // Make sure the 1st image is cached (for the lightbox display)
                if (index == 0) {
                    var imgCache = document.createElement('img')
                    imgCache.src = getFilePath(index,"Smaller")
                }
                thumb = img
                thumbnailRow2Col1.appendChild(thumb)

            } else if (mediaType == 4) {
                docFiles = true
                let a = document.createElement("a")
                a.href = getFilePath(index)
                a.type = "application/pdf"
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

        //----------------------------------------------------------------------------------------------------
        // If there is a filter request list, create Filter Request buttons with the start date
        //----------------------------------------------------------------------------------------------------
        /*
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
                    button2.classList.add('btn',buttonColor,'btn-sm','shadow-none','me-2','my-2',MediaFilterRequestClass)
                    button2.textContent = FilterRec.filterName
                    thumbnailRow3Col1.appendChild(button2)
                }
            }
            if (mediaType == 1 && mediaInfo.fileList.length > 50) {
                let buttonTop = document.createElement("button")
                buttonTop.setAttribute('type',"button")
                buttonTop.classList.add('btn','btn-primary','btn-sm','shadow-none','me-2','my-2')
                buttonTop.textContent = "Top"
                thumbnailRow3Col1.appendChild(buttonTop)
                buttonTop.addEventListener("click", function () {
                    window.scrollTo(0, 0)
                });
            }
        }
        */

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

