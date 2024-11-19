/*==============================================================================
(C) Copyright 2024 John J Kauflin, All rights reserved.
--------------------------------------------------------------------------------
DESCRIPTION:  Common utility functions for Web API's
--------------------------------------------------------------------------------
Modification History
2024-08-28 JJK  Initial version (converted from older PHP code)
2024-11-04 JJK  Finished stringToMoney and CalcCompoundInterest
2024-11-18 JJK  Added getConfigVal
================================================================================*/

using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using Microsoft.Azure.Cosmos;

using GrhaWeb.Function.Model;

namespace GrhaWeb.Function
{
    public class CommonUtil
    {
        private readonly ILogger log;
        public CommonUtil(ILogger logger)
        {
            log = logger;
        }

        public decimal stringToMoney(string moneyString) {
            // Remove the dollar sign and parse the string to a decimal
            decimal moneyValue = decimal.Parse(moneyString.TrimStart('$'));
            // Round down to 2 decimal places
            moneyValue = Math.Floor(moneyValue * 100) / 100;
            return moneyValue;
        }

        public decimal CalcCompoundInterest(decimal principal, DateTime startDate) {
			/*
				 A = the future value of the investment/loan, including interest
				 P = the principal investment amount (the initial deposit or loan amount)
				 r = the annual interest rate (decimal)
				 n = the number of times that interest is compounded per year
				 t = the number of years the money is invested or borrowed for
				 A = P(1+r/n)^nt
			*/

            double interestAmount;

            // Annaul percentage rate (i.e. 6%)
            double rate = 0.06;
            // Frequency of compounding (1 = yearly, 12 = monthly)
            double annualFrequency = 12.0;

            DateTime currDate = DateTime.Now;
            TimeSpan diff = currDate - startDate;

            // Time in fractional years
            double timeInYears = Math.Abs(diff.Days) / 365.0;
            double P = (double) principal;
            double A = P * Math.Pow(1.0+(rate/annualFrequency), annualFrequency*timeInYears);
            interestAmount = A - P;
            // Round to 2 decimal places
            interestAmount = Math.Round(interestAmount,2);

            //log.LogWarning($">>> timeInYears: {timeInYears}, P: {P}, A: {A}, interestAmount: {interestAmount}");

            return (decimal)interestAmount;
        }

        public async Task<string> getConfigVal(Database db, Container container, string configName) {
            string configVal = "";
            string sql = $"SELECT * FROM c WHERE c.ConfigName = '{configName}' ";
            var feed = container.GetItemQueryIterator<hoa_config>(sql);
            while (feed.HasMoreResults)
            {
                var response = await feed.ReadNextAsync();
                foreach (var item in response)
                {
                    configVal = item.ConfigValue ?? "";
                }
            }
            return configVal;
        }


        /*
        public DateTime parseDateTime(string inDateStr) {
            DateTime outDateTime;
            string dateStr = inDateStr.Trim();
            int spacePos = dateStr.IndexOf(' ');
            if (spacePos > -1) {
                dateStr = dateStr.Substring(0, spacePos);
            }

            if (!DateTime.TryParse(dateStr, out outDateTime)) {
                // problem with date
            }

                                //if (DateTime.TryParseExact(dateStr, dateFormat, null, System.Globalization.DateTimeStyles.None, out outDateTime))
                    // Modified to assume that the datetime in the filename format (from iPhone iOS) is a UTC datetime - this will make sure the datetime gets
                    // converted to local datetime for an accurate datetime of when the photo was taken
                    if (DateTime.TryParseExact(dateStr, dateFormat, null, System.Globalization.DateTimeStyles.AssumeUniversal, out outDateTime))
                    {
                        //log($"{fileName}, date: {dateStr}, format: {dateFormat}, DateTime: {outDateTime}");
                    }
                    else
                    {
                        Console.WriteLine($"{fileName}, date: {dateStr}, format: {dateFormat}, *** PARSE FAILED ***");
                    }

            return outDateTime;
        }
        */

                        //  "DateDue": "10/1/2006 0:00:00",
                        //     "DateDue": "10/1/2014 0:00:00",
                        //   "DateDue": "10/1/2015",
                        // "DateDue": "2024-10-01",
                        //item.DateDue

                        // util function for a common date - take both formats, check for a space
                        //        if ($startDateTime = date_create( strtok($startDate," ") )) {


// Replace every ascii character except decimal and digits with a null, and round to 2 decimal places
/*

function strToUSD($inStr) {
	// Replace every ascii character except decimal and digits with a null
	$numericStr = preg_replace('/[\x01-\x2D\x2F\x3A-\x7F]+/', '', $inStr);
	// Convert to a float value and round down to 2 digits
	//return round(floatval($numericStr),2,PHP_ROUND_HALF_DOWN);
	return round(floatval($numericStr),2);
}

// Replace comma with null so you can use it as a CSV value
function csvFilter($inVal) {
    $inStr = (string) $inVal;
	//return preg_replace('/[\x2C]+/', '', String($inVal));
	return preg_replace('/[\x2C]+/', '', $inStr);
}

function downloadUrlToFile($url)
{
    try {
        $currTimestampStr = date("YmdHis");
        $tempFilename = sys_get_temp_dir() . DIRECTORY_SEPARATOR . $currTimestampStr . 'jjktemp.zip';
	    $tempFile = fopen($tempFilename, 'w');

        // create a new cURL resource
        $ch = curl_init();
        // set URL and other appropriate options
        curl_setopt($ch, CURLOPT_URL, $url);        // URL to call
        curl_setopt($ch, CURLOPT_FILE, $tempFile);  // Write output to this file
        curl_setopt($ch, CURLOPT_HEADER, false);
        //curl_setopt($ch, CURLOPT_USERAGENT, 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.105 Safari/537.36');
        curl_setopt($ch, CURLOPT_POST, 0); // Don't use HTTP POST (use default of HTTP GET)
        // CURLOPT_HTTPGET is default
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);  // Don't check SSL
        // CURL_HTTP_VERSION_1_1
		//curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);  // return actual data for:  $file_content = curl_exec($ch);

        // grab URL and pass it to the browser
        curl_exec($ch);
		//$file_content = curl_exec($ch);

        // close cURL resource, and free up system resources
        curl_close($ch);
        fclose($tempFile);

function getMailer($mailUsername, $mailPassword, $mailServer, $mailPort) {
    //error_log(date('[Y-m-d H:i] '). "in " . basename(__FILE__,".php") . ", BEFORE " . PHP_EOL, 3, LOG_FILE);

    // Create a Transport object
    $transport = Transport::fromDsn('smtp://' . $mailUsername . ':' . $mailPassword . '@' . $mailServer . ':' . $mailPort);
    // Create a Mailer object
    $mailer = new Mailer($transport);

	return $mailer;
}

function sendMail($mailer,$toStr,$subject,$messageStr,$fromEmailAddress) {
    try {
    	$message = '<html><head><title>' . $subject .'</title></head><body>' . $messageStr . '</body></html>';

        $email = (new Email());
        $email->from($fromEmailAddress);
        $email->to($toStr);
        $email->subject($subject);
        // Set the plain-text "Body"
        //$email->text('This is the plain text body of the message.\nThanks,\nAdmin');
        // Set HTML "Body"
        $email->html($message);
        // Add an "Attachment"
        //$email->attachFromPath('/path/to/example.txt');
        // Add an "Image"
        //$email->embed(fopen('/path/to/mailor.jpg', 'r'), 'nature');

    	$mailer->send($email);
        return true;

    } catch(Exception $e) {
        error_log(date('[Y-m-d H:i:s] '). "in " . basename(__FILE__,".php") . ", sendEMail Exception = " . $e->getMessage() . PHP_EOL, 3, LOG_FILE);
        return false;
    }
}



function sendHtmlEMail($toStr,$subject,$messageStr,$fromEmailAddress) {
    try {
    	$message = '<html><head><title>' . $subject .'</title></head><body>' . $messageStr . '</body></html>';
        // Always set content-type when sending HTML email
    	$headers = "MIME-Version: 1.0" . "\r\n";
    	$headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
    	// More headers
        $headers .= 'From: ' . $fromEmailAddress . "\r\n";

        if (!function_exists('mail'))
        {
            error_log(date('[Y-m-d H:i:s] '). "in " . basename(__FILE__,".php") . ", mail() has been disabled " . PHP_EOL, 3, LOG_FILE);
            return false;
        }

    	if (mail($toStr,$subject,$message,$headers)) {
            return true;
        } else {
            return false;
        }

    } catch(Exception $e) {
        error_log(date('[Y-m-d H:i:s] '). "in " . basename(__FILE__,".php") . ", sendHtmlEMail Exception = " . $e->getMessage() . PHP_EOL, 3, LOG_FILE);
        return false;
    }
}

function truncDate($inStr) {
	$outStr = "";
	if ($inStr != null) {
		$outStr = strtok($inStr," ");
		if (strlen($outStr) > 10) {
			$outStr = substr($outStr,0,10);
		}
	}
	return $outStr;
}


function stringToMoney($inAmountStr) {
	return round(floatval( preg_replace('/[\x01-\x2D\x2F\x3A-\x7F]+/', '', $inAmountStr) ),2);
}
*/


    } // public class CommonUtil
} // namespace GrhaWeb.Function

