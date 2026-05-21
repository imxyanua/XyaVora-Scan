from app.analyzers.server_location_analyzer import _parse_location_response


def test_parse_location_response_success():
    result = _parse_location_response(
        {
            "success": True,
            "ip": "203.0.113.10",
            "city": "London",
            "region": "England",
            "postal": "EC3R 7LP",
            "country": "United Kingdom",
            "country_code": "GB",
            "latitude": 51.5095,
            "longitude": -0.0955,
            "timezone": {"id": "Europe/London"},
            "currency": {"name": "British pound", "code": "GBP"},
            "connection": {"asn": 64500, "org": "Example Org", "isp": "Example ISP"},
        },
        "203.0.113.10",
    )

    assert result.ip == "203.0.113.10"
    assert result.city == "London"
    assert result.countryCode == "GB"
    assert result.timezone == "Europe/London"
    assert result.currency == "British pound"
    assert result.currencyCode == "GBP"
    assert result.languages == ["English"]
    assert result.latitude == 51.5095
    assert result.longitude == -0.0955
    assert "country: United Kingdom" in result.locationEvidence


def test_parse_location_response_failure():
    result = _parse_location_response({"success": False, "message": "reserved range"}, "127.0.0.1")

    assert result.ip == "127.0.0.1"
    assert result.error == "reserved range"
