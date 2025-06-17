<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class bbbvalidator
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $apiToken = $request->bearerToken();
        $envToken = $_ENV['ACCESS_TOKEN'];
        if ($apiToken != $envToken)
            return ApiResponse("Access Token is invalid","error",401);

        return $next($request);
    }
}
