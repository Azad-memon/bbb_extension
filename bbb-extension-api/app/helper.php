<?php

//Important Code

if (!function_exists('cd')) {
    function cd(...$data)
    {
        echo "<pre >";

        foreach ($data as $item) {
            if (is_array($item) || is_object($item)) {
                try {
                    print_r(json_decode(json_encode($item), true));
                } catch (\Throwable $e) {
                    var_dump($item);
                }
            } else {
                echo $item . PHP_EOL;
            }
        }

        echo "</pre>";
        die;
    }
}

//stdobject to Array
if (!function_exists('objectToArray')) {
    function objectToArray($object)
    {
        if (!is_object($object) && !is_array($object)) {
            return $object;
        }
        return array_map('objectToArray', (array) $object);
    }
}


// //Check Numeric URL
// if (!function_exists('checkParamUrl')) {
//     function checkParamUrl($value1, $value2, $value3 = "")
//     {
//         $redirect_url = $value2;
//         if (empty($value1)) {
//             session()->flash("error", "Url is empty");
//             echo redirect($redirect_url);
//         }
//         $url_id = substr($value1, 5);

//         if (empty($value3))
//             $error_flash = "Invalid Url";
//         else
//             $error_flash = $value3;

//         if (!is_numeric($url_id)) {

//             session()->flash("error", $error_flash);
//             echo redirect($redirect_url);
//         }

//         return $url_id;

//     }
// }

if (!function_exists('urlParam')) {
    function urlParam($id)
    {
        return rand(10000, 99999) . $id;

    }
}

if (!function_exists('encodeTo16Char')) {

    function encodeTo16Char($number)
    {

        $characters = 'arstuvwxyzABCDESTUVWXYZ0123456789!@#^&*()';
        $base = strlen($characters);

        $code = '';
        while ($number > 0) {
            $remainder = $number % $base;
            $number = intdiv($number, $base);
            $code = $characters[$remainder] . $code;
        }

        // Pad the code with leading zeros if needed
        $code = str_pad($code, 16, 'a', STR_PAD_LEFT);

        return rtrim(strtr(base64_encode($code), '+/', '-_'), '=');
    }
}
if (!function_exists('decodeFrom16Char')) {
    function decodeFrom16Char($code)
    {
        $characters = 'arstuvwxyzABCDESTUVWXYZ0123456789!@#^&*()';
        $base = strlen($characters);

        $code = str_pad(strtr($code, '-_', '+/'), 16, 'a', STR_PAD_LEFT);
        $code = base64_decode($code);

        $number = 0;
        $length = strlen($code);
        for ($i = 0; $i < $length; $i++) {
            $char = $code[$i];
            $value = strpos($characters, $char);
            $number = $number * $base + $value;
        }

        return $number;
    }
}

function jsonMessage($message, $response = "success", $redirect = "crm")
{
    session()->flash("jsonMessage", "true");
    session()->flash("message", $message);
    session()->flash("response", "$response");
    return redirect()->to($redirect);
}

function jsonMessage2($message, $response = "success", $redirect = "crm")
{
    session()->flash("jsonMessage2", "true");
    session()->flash("message", $message);
    session()->flash("response", $response);
    return redirect()->to($redirect);
}

function Code300($message)
{

    $ssdata = array('status' => 'error', 'code' => '300', 'message' => $message);
    $ssdata = json_encode($ssdata);
    return response()->json($ssdata);
}
function Code302($message)
{
    $ssdata = array('status' => 'error', 'code' => '302', 'message' => $message);
    $ssdata = json_encode($ssdata);
    return response()->json($ssdata);
}

function Code200($message, $messageTitle = "", $data = "", $status = "success")
{
    $ssdata = array('status' => $status, 'code' => '200', 'message' => $message, 'messageTitle' => $messageTitle);
    if (!empty($data))
        $ssdata['data'] = $data;
    $ssdata = json_encode($ssdata);
    return response()->json($ssdata);
}

if (!function_exists('flashMessage')) {
    function flashMessage($responseType = "", $message = "", $redirect = "")
    {
        if (empty($responseType) || empty($message)) {
            throw new InvalidArgumentException("Response type and message cannot be empty.");
        }
        session()->flash($responseType, $message);
        return !empty($redirect) ? redirect($redirect) : back();
    }
}



//Check Numeric URL
if (!function_exists('checkParamUrl')) {
    function checkParamUrl($url, $redirect_url = "homepage", $errorMessage = "")
    {
        if (empty($errorMessage))
            $error_flash = "Invalid Url";
        else
            $error_flash = $errorMessage;
        if (empty($url)) {
            session()->flash("error", "Url is empty");
            echo redirect($redirect_url);
        }
        if (!is_numeric($url)) {
            session()->flash("error", $error_flash);
            echo redirect($redirect_url);
        }
        $url_id = substr($url, 5);
        return $url_id;
    }
}

if (!function_exists('ConvertToTimesAgo')) {
    function ConvertToTimesAgo($time)
    {
        $current_time = strtotime(now());
        $database_time = strtotime($time);
        $remaining_time = $current_time - $database_time;

        if ($remaining_time < 60) {
            $remaining_time = $remaining_time . " seconds ago";
        } elseif ($remaining_time < 3600) {
            $minutes = floor($remaining_time / 60);
            $remaining_time = $minutes . " minute" . ($minutes > 1 ? "s" : "") . " ago";
        } elseif ($remaining_time < 86400) {
            $hours = floor($remaining_time / 3600);
            $remaining_time = $hours . " hour" . ($hours > 1 ? "s" : "") . " ago";
        } else {
            $days = floor($remaining_time / 86400);
            $remaining_time = $days . " day" . ($days > 1 ? "s" : "") . " ago";
        }
        echo $remaining_time;
    }
}

if (!function_exists('saveImages')) {
    function saveImages($data, $path = "images")
    {
        $finalResult = null;
        $result = [];
        if (!empty($data) && is_array($data)) {
            foreach ($data as $key => $eImage) {
                $upload_filename = "image_{$key}" . session()->get("userId") . time() . "-ws." . $eImage->getClientOriginalExtension();
                $eImage->storeAs("public/uploads/{$path}/", $upload_filename);
                $imagePath = asset("storage/uploads/{$path}/" . $upload_filename);
                $result[$key] = $imagePath;
            }
        }

        $finalResult['images'] = $result;
        return $finalResult;
    }

}


function getImageByType($images, $type)
{

    $image = collect($images)->firstWhere('image_type', $type);
    return $image ? $image['image'] : ''; // If found, return the image URL, otherwise return an empty string
}


if (!function_exists('getRangeFromArray')) {
    function getRangeFromArray($array)
    {
        $keys = array_keys($array);
        $lowest = min($keys);
        $highest = max($keys);
        return "$lowest-$highest";
    }
}



if (!function_exists('ApiResponse')) {

    function ApiResponse($message, $status = 'success', $code = 200, $data = null, $messageTitle = "")
    {
        $response = [
            'status' => $status,
            'code' => $code,
            'message' => $message,
        ];

        if (!empty($messageTitle)) {
            $response['messageTitle'] = $messageTitle;
        }

        if (!empty($data)) {
            $response['data'] = $data;
        }

        return response()->json($response, $code);
    }
}


if (!function_exists('sendOtp')) {
    function sendOtp($modelType, $modelId)
    {
        try {
            $otpCode = rand(100000, 999999);

            DB::table('otp')->insert([
                'otpable_id' => $modelId,
                'otpable_type' => $modelType,
                'otp_code' => $otpCode,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return true;
            // return ApiResponse('OTP has been sent successfully.', 'success', 200, ['otp_code' => $otpCode]);

        } catch (\Exception $e) {
            // Handle any errors (e.g., database errors)
            return false;
            // return ApiResponse('Failed to send OTP. Please try again.', 'error', 500);
        }
    }
    if (!function_exists('getMenuItems')) {
        function getMenuItems()
        {
            return
                [App\Models\ModelPizza::class => "Pizzas", App\Models\ModelProducts::class => "Products", App\Models\ModelDeals::class => "Deals"];
        }
    }


    if (!function_exists('getDealItems')) {
        function getDealItems()
        {
            return
                [App\Models\ModelPizza::class => "Pizzas", App\Models\ModelProducts::class => "Products", App\Models\ModelDealChoices::class => "Choices"];
        }
    }

}


function isValidPowerOfTwoForTournament(int $n): bool
{
    return $n > 1 && ($n & ($n - 1)) === 0;
}

if (!function_exists('getParticipantImage')) {
    function getParticipantImage($participants, $name)
    {
        $participant = collect($participants)->firstWhere('display_name', $name);
        return $participant['profile_pic'] ?? asset('admin-panel/assets/images/defaultImages/defaultMaleImage.png');
    }
}


if (!function_exists('getGroupWinVerbages')) {

    function getGroupWinVerbages($type = 'ModelUser')
    {
        $verbages_1v1 = [
            "clinched the win with style.",
            "made a statement with that victory.",
            "showed up and showed out.",
            "left nothing to chance — took the win.",
            "claimed the W with confidence.",
            "outmaneuvered the competition.",
            "locked in the win.",
            "proved they had the edge.",
            "turned up when it mattered.",
            "delivered under pressure.",
            "showed true competitive spirit.",
            "secured the victory — no question.",
            "left with bragging rights.",
            "finished strong for the W.",
            "did what needed to be done.",
            "handled business with that win.",
            "put another W on the board.",
            "kept it cool and collected the win.",
            "made it happen when it counted.",
            "played smart and won it.",
            "added another to the win column.",
            "stood tall in the moment.",
            "found a way to win.",
            "put their skills on full display.",
            "kept calm and closed it out.",
            "held their ground and won.",
            "played with confidence and took it.",
            "earned the win fair and square.",
            "proved they came to compete.",
            "showed up ready and took the W.",
        ];
        $verbages_2v2 = [
            "secured the win with perfect teamwork.",
            "proved that chemistry wins games.",
            "clicked and claimed the W.",
            "showed the power of teamwork.",
            "took control and didn’t look back.",
            "played smart and won together.",
            "outplayed the competition as a team.",
            "found a winning rhythm.",
            "combined for the victory.",
            "made the dream team look real.",
            "locked in and took the win.",
            "came together for a clutch W.",
            "coordinated perfectly for the win.",
            "backed each other up for the W.",
            "turned teamwork into a victory.",
            "proved they’re a tough duo.",
            "showed true partner chemistry.",
            "took on the challenge and won.",
            "stuck together and took the win.",
            "never broke focus — won together.",
            "read each other perfectly for the win.",
            "made a winning combo look easy.",
            "delivered a masterclass in teamwork.",
            "synchronized and secured the W.",
            "put on a duo display for the win.",
            "played smart, won smart.",
            "took it together, start to finish.",
            "left no doubt who the better team was.",
            "proved two are better than one.",
            "showed they’ve got each other’s back.",
        ];
        return $type === 'ModelTeam' ? $verbages_2v2 : $verbages_1v1;
    }



}











?>