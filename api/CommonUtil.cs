/*==============================================================================
(C) Copyright 2024 John J Kauflin, All rights reserved.
--------------------------------------------------------------------------------
DESCRIPTION:  Common utility functions for Web API's
--------------------------------------------------------------------------------
Modification History
2024-08-28 JJK  Initial version (converted from older PHP code)
================================================================================*/

using GrhaWeb.Function.Model;

namespace GrhaWeb.Function
{
    public class CommonUtil
    {

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


        public decimal CalcCompoundInterest(decimal principal, string startDate) {
			/*
				 A = the future value of the investment/loan, including interest
				 P = the principal investment amount (the initial deposit or loan amount)
				 r = the annual interest rate (decimal)
				 n = the number of times that interest is compounded per year
				 t = the number of years the money is invested or borrowed for
				 A = P(1+r/n)^nt
			*/

            decimal interestAmount = 35.0m;

            // Annaul percentage rate (i.e. 6%)
            decimal rate = 0.06m;
            // Starting principal value
            // Frequency of compounding (1 = yearly, 12 = monthly)
            decimal annualFrequency = 12.0m;
    /*
	if ($startDate != null && $startDate != '' && $startDate != '0000-00-00') {

		// Convert the 1st start date string token (i.e. till space) into a DateTime object (to check the date)
		if ($startDateTime = date_create( strtok($startDate," ") )) {
			// Difference between passed date and current system date
			$diff = date_diff($startDateTime,date_create(),true);

			// Time in fractional years
			$time = floatval($diff->days) / 365.0;

			$A = floatval($principal) * pow((1+($rate/$annualFrequency)),($annualFrequency*$time));
			// Subtract the original principal to get just the interest
			$interestAmount = round(($A - $principal),2);

		} else {
			// Error in date_create
			error_log(date('[Y-m-d H:i:s] '). "Problem with StartDate = " . $startDate . PHP_EOL, 3, "jjk-commonUtil.log");
		}
	}
    */

				/*
//Monthly
	for ($time = 1; $time <= 10; $time++) {
		$interestAmount = round($principal * pow((1+($rate/$annualFrequency)),($annualFrequency*$time)),2,PHP_ROUND_HALF_DOWN);
		//echo "<br>Year = $time ($principal * pow((1+($rate/$annualFrequency)),($annualFrequency*$time)) = " . $principalWithInterest;
	}

				$annualFrequency = 1.0;
				echo "<br><br>Compounded Yearly";
				for ($time = 1; $time <= 10; $time++) {
					$principalWithInterest = round($principal * pow((1+($rate/$annualFrequency)),($annualFrequency*$time)),2,PHP_ROUND_HALF_DOWN);
					echo "<br>Year = $time ($principal * pow((1+($rate/$annualFrequency)),($annualFrequency*$time)) = " . $principalWithInterest;
				}
				*/



            return interestAmount;
        }

    } // public class CommonUtil
} // namespace GrhaWeb.Function

