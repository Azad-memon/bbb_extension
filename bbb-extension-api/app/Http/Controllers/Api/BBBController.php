<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;

class BBBController extends Controller
{

    public function search(Request $request)
    {
        $apiKey = env('API_KEY');
        $businessUrl = $request->input('url');

        $domainExceptions = [
            'mail.google.com' => 'gmail.com',
            'shopify.myshopify.com' => 'shopify.com',
            'login.microsoftonline.com' => 'microsoft.com',
        ];

        // Step 2: Extract host and check against exceptions
        if (!preg_match('#^https?://#i', $businessUrl)) {
            $businessUrl = 'https://' . $businessUrl;
        }
        $parsedHost = parse_url($businessUrl, PHP_URL_HOST);
        $parsedHost = preg_replace('/^www\./', '', $parsedHost);
        if (isset($domainExceptions[$parsedHost])) {
            $businessUrl = 'https://' . $domainExceptions[$parsedHost];
        } else {
            $hostParts = explode('.', $parsedHost);
            $hostPartsCount = count($hostParts);

            if ($hostPartsCount > 2) {
                $mainDomain = $hostParts[$hostPartsCount - 2] . '.' . $hostParts[$hostPartsCount - 1];
                $businessUrl = 'https://' . $mainDomain;
            } else {
                $businessUrl = 'https://' . $parsedHost; // Already a root domain
            }
        }

        $endpoint = "https://api.bbb.org/v2/orgs/search?BusinessURL=" . urlencode($businessUrl);
        $curl = curl_init();

        curl_setopt_array($curl, [
            CURLOPT_URL => $endpoint,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                "Authorization: Bearer $apiKey",
                "Accept: application/json"
            ]
        ]);

        $response = curl_exec($curl);
        $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        curl_close($curl);
     
        if ($httpCode !== 200 || !$response) {
            return response()->json(['message' => 'Failed to reach BBB API'], 500);
        }

        $data = json_decode($response, true);

        if (!empty($data['searchResults'])) {
            $result = $data['searchResults'][0];

            $isAccredited = $result['isBBBAccredited'] ?? false;

            $responseData = [
                'businessName' => $result['organizationName'] ?? null,
                'primaryCategory' => $result['primaryCategory'] ?? null,
                'isBBBAccredited' => $isAccredited,
                'bbbRating' => trim($result['bbbRating'] ?? ''),
                'accreditationDate' => isset($result['accreditationDate']) ? substr($result['accreditationDate'], 0, 10) : null,
                'bbbFileOpenDate' => isset($result['bbbFileOpenDate']) ? substr($result['bbbFileOpenDate'], 0, 10) : null,
                'dateBusinessStarted' => isset($result['dateBusinessStarted']) ? substr($result['dateBusinessStarted'], 0, 10) : null,
                'location' => ($result['city'] ?? '') . ', ' . ($result['stateProvince'] ?? '') . ' ' . ($result['postalCode'] ?? ''),
                'address' => $result['address'] ?? null,
                'phones' => $result['phones'] ?? [],
                'emails' => $result['contactEmailAddress'] ?? [],
                'altNames' => $result['altOrganizationNames'] ?? [],
                'organizationType' => $result['organizationType'] ?? null,
                'ratingIcon' => $result['ratingIcons'][0]['url'] ?? null,
                'profileUrl' => $result['profileUrl'] ?? $result['reportURL'] ?? null,
                'logoUrl' => $isAccredited ? URL::to('/bbb_logo.png') : null,
                'businessId' => $result['businessId'] ?? null,
                'bbbId' => $result['bbbId'] ?? null,
                'businessUrl' => $businessUrl ?? null,

            ];

            if (!empty($result['statistics'])) {
                $responseData['reviews'] = [
                    'totalCustomReviews' => $result['statistics']['totalCustomReviews'] ?? 0,
                    'averageReviewStarRating' => $result['statistics']['averageReviewStarRating'] ?? null,
                    'totalComplaints' => $result['statistics']['totalComplaints'] ?? 0,
                    'totalClosedComplaintsPastTwelveMonths' => $result['statistics']['totalClosedComplaintsPastTwelveMonths'] ?? 0,
                    'totalClosedComplaintsPastThreeYears' => $result['statistics']['totalClosedComplaintsPastThreeYears'] ?? 0,
                ];
            }

            return response()->json($responseData);
        }

        return response()->json(['message' => 'No business found'], 404);
    }

}
