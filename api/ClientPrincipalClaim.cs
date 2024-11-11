using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
//using Microsoft.AspNetCore.Http;
using Microsoft.Azure.Functions.Worker.Http;

public class ClaimsPrincipalParser
{
    private class ClientPrincipalClaim
    {
        [JsonPropertyName("typ")]
        public string Type { get; set; }
        [JsonPropertyName("val")]
        public string Value { get; set; }
    }

    private class ClientPrincipal
    {
        [JsonPropertyName("userId")]
        public string userId { get; set; }
        [JsonPropertyName("userRoles")]
        public string[] userRoles { get; set; }
        [JsonPropertyName("identityProvider")]
        public string identityProvider { get; set; }
        [JsonPropertyName("userDetails")]
        public string userDetails { get; set; }
        
        [JsonPropertyName("auth_typ")]
        public string IdentityProvider { get; set; }
        [JsonPropertyName("name_typ")]
        public string NameClaimType { get; set; }
        [JsonPropertyName("role_typ")]
        public string RoleClaimType { get; set; }
        
        [JsonPropertyName("claims")]
        public IEnumerable<ClientPrincipalClaim> Claims { get; set; }
    }

/*
ClaimsIdentity userIdentity = new ClaimsIdentity(
  new Claim[] {
    new Claim("Id", "1"),
    new Claim("Username", "Bert")
  },
  "Bearer"
);
//userIdentity.IsAuthenticated == true since we passed "Bearer" as AuthenticationType.
*/

    public ClaimsPrincipal Parse(HttpRequestData req)
    {
        var principal = new ClientPrincipal();

        if (req.Headers.TryGetValues("x-ms-client-principal", out var headerValues))
        {
            var headerValue = headerValues.FirstOrDefault();
            var decoded = Convert.FromBase64String(headerValue);
            var jsonStr = Encoding.UTF8.GetString(decoded);
            // {"userId":"b2754551a423931bca428d692f2cad2b","userRoles":["anonymous","authenticated","hoadbadmin"],"identityProvider":"aad","userDetails":"jkauflin"}
            principal = JsonSerializer.Deserialize<ClientPrincipal>(jsonStr, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        }

        /** 
         *  At this point, the code can iterate through `principal.Claims` to
         *  check claims as part of validation. Alternatively, we can convert
         *  it into a standard object with which to perform those checks later
         *  in the request pipeline. That object can also be leveraged for 
         *  associating user data, etc. The rest of this function performs such
         *  a conversion to create a `ClaimsPrincipal` as might be used in 
         *  other .NET code.
         */

        var identity = new ClaimsIdentity(principal.IdentityProvider, principal.NameClaimType, principal.RoleClaimType);
        identity.AddClaims(principal.Claims.Select(c => new Claim(c.Type, c.Value)));
        return new ClaimsPrincipal(identity);
    }
}
