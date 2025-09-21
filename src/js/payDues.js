/*==============================================================================
 * (C) Copyright 2015,2022,2024 John J Kauflin, All rights reserved.
 *----------------------------------------------------------------------------
 * DESCRIPTION:  Javascript for the page that present the buttons to
 *               make an online payment for dues
 *----------------------------------------------------------------------------
 * Modification History
 * 2021-01-01 JJK 	Initial version (seperated from main page to implement
 *                  newest Paypal API integration and button rendering)
 * 2021-02-13 JJK   Added parcelId after FY in the CustomId
 * 2021-07-17 JJK   Added money format around processing fee
 * 2021-10-02 JJK   Added clear of buttons after successful Paypal approval
 *                  and call of handlePayment
 * 2022-06-26 JJK   Convert to vanilla javascript (no dependence on JQuery)
 * 2024-08-25 JJK   Convert to js module and update inputs and api calls
 *                  for migration to Azure SWA
 * 2025-09-20 JJK   Convert for .NET backend server functions
 *============================================================================*/

import {empty,showLoadingSpinner,checkFetchResponse,formatMoney} from './util.js';

var payDuesTitle
var payDuesTitle2
var payDuesMessage
var payDuesButtons

document.addEventListener('DOMContentLoaded', () => {
	//=================================================================================================================
	// Variables cached from the DOM
    payDuesTitle = document.getElementById("PayDuesTitle")
    payDuesTitle2 = document.getElementById("PayDuesTitle2")
    payDuesMessage = document.getElementById("PayDuesMessage")
    payDuesButtons = document.getElementById("paypal-button-container")

    empty(payDuesTitle)
    empty(payDuesTitle2)

    // The Parcel ID should be passed as a parameter on the URL
    var results = new RegExp('[\?&]parcelId=([^&#]*)').exec(window.location.href);
    if (results != null) {
        let rawParcelId = results[1] || 0;
        let parcelId = decodeURIComponent(rawParcelId);
        //console.log("parcelId = " + parcelId);
        startPaymentCapture(parcelId)
    }
})

async function startPaymentCapture(parcelId) {
    // Fetch data from the database for this property (through the public API function)
    //return fetch('hoadb/getHoaDbData2.php?parcelId='+rawParcelId)

    showLoadingSpinner(payDuesMessage);
    try {
        const response = await fetch('/api/GetHoaRec2', {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: parcelId
        })
        await checkFetchResponse(response)
        payDuesMessage.textContent = ''
        const hoaRec = await response.json();
        console.log("hoaRec.Parcel_ID = "+hoaRec.Parcel_ID);

        if (hoaRec.TotalDue == 0) {
            payDuesMessage.textContent = "No Dues are currently owed on this property"
        } else if (hoaRec.TotalDue != formatMoney(hoaRec.assessmentsList[0].DuesAmt)) {
            payDuesMessage.textContent = "More than current year dues are owed on this property - contact Treasurer"
        } else {
            var paymentValue = hoaRec.TotalDue + hoaRec.paymentFee;
            payDuesTitle.textContent = "Pay HOA dues for property at "+hoaRec.Parcel_Location
            payDuesTitle2.textContent = `$${hoaRec.TotalDue} (Dues) + $${formatMoney(hoaRec.paymentFee)} (Processing Fee) = $${formatMoney(paymentValue)} Total`
            //"$"+hoaRec.TotalDue+" (Dues) + $"+formatMoney(hoaRec.paymentFee) +" (Processing Fee) = $"+formatMoney(paymentValue)+" Total"

            // Use the Paypal javascript SDK to render buttons for dues payment, and respond to approval
            paypal.Buttons({
                style: {
                    //layout:  'vertical',
                    //color:   'gold',
                    //shape:   'rect',
                    label:   'pay'
                },
                // Create an order with the payment amount, and re-direct to Paypal for approval of the payment transaction
                createOrder: function (data, actions) {
                    return actions.order.create({
                        purchase_units: [{
                            reference_id: parcelId,
                            amount: {
                                value: paymentValue
                            },
                            description: hoaRec.assessmentsList[0].FY+' Dues and processing fee for property at '+hoaRec.Parcel_Location,
                            custom_id: hoaRec.assessmentsList[0].FY+','+parcelId
                        }]
                    });
                },
                onApprove: function (data) {
                    // After payment approval, call a secure backend server function service to capture the order payment details from Paypal
                    // and update the HOADB to record the payment (and also send confirmation emails)
                    //return fetch('hoadb/handlePayment.php?orderID='+data.orderID)
                    //return fetch('api/HandlePayment?orderID='+data.orderID)

                    fetch('/api/GetHoaRec2', {
                        method: 'POST',
                        headers: { "Content-Type": "application/json" },
                        body: data.orderID
                    })
                        .then(function (response) {
                            //console.log(response);
                            // After successful recording of payment, clear the paypal buttons
                            empty(payDuesButtons)
                            // Check the status of the reponse (400 or 500 errors)
                            if (response.ok) {
                                // if response and JSON are OK, return the JSON object part of the fetch response to the next promise
                                return response.json();
                            } else {
                                payDuesMessage.textContent = "Payment made but there was a problem updating HOA records - contact Treasurer"
                                throw new Error('Error in response or JSON from server, code = '+response.status);
                            }
                            //return response.json();
                        }).then(function (details) {
                            payDuesMessage.textContent = "Thank you, "+details.result.payer.name.given_name
                                +".  "+hoaRec.assessmentsList[0].FY+' Dues for property at '+hoaRec.Parcel_Location
                                +" have been marked as PAID"
                        })

                },
                onCancel: function (data) {
                    payDuesMessage.textContent = "Payment cancelled "
                },
                onError: function (err) {
                    console.log("Error in payment, err = "+err);
                    payDuesMessage.textContent = "Error in payment - contact Treasurer"
                }
            }).render('#paypal-button-container'); // Display payment options on your web page
        }

    } catch (err) {
        payDuesMessage.textContent = "Error in getting data on property, err = "+err.message
    } finally {
        //confirmBtn.disabled = false;
    }

}
