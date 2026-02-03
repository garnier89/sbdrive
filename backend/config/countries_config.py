# Configuration complète des 21 pays africains avec Mobile Money
# Opérateurs téléphoniques et Mobile Money par pays

# Liste complète des 21 pays africains + France
AFRICAN_COUNTRIES_CONFIG = {
    # Afrique de l'Ouest - Zone UEMOA (XOF)
    "SN": {
        "name": "Sénégal",
        "flag": "🇸🇳",
        "currency": "XOF",
        "phone_prefix": "+221",
        "mobile_money": [
            {"code": "wave", "name": "Wave", "logo": "🌊", "color": "#1DA1F2", "min": 500, "max": 2000000, "fee_percent": 0},
            {"code": "orange_money", "name": "Orange Money", "logo": "🟠", "color": "#FF6600", "min": 500, "max": 1000000, "fee_percent": 0.5},
            {"code": "free_money", "name": "Free Money", "logo": "🔵", "color": "#0066CC", "min": 500, "max": 500000, "fee_percent": 0.5},
            {"code": "e_money", "name": "E-Money (Ecobank)", "logo": "💚", "color": "#00A650", "min": 1000, "max": 500000, "fee_percent": 0.5}
        ],
        "telecom_operators": [
            {"code": "orange_sn", "name": "Orange Sénégal", "logo": "🟠", "prefixes": ["77", "78"]},
            {"code": "free_sn", "name": "Free Sénégal", "logo": "🔵", "prefixes": ["76"]},
            {"code": "expresso_sn", "name": "Expresso", "logo": "🟢", "prefixes": ["70"]}
        ]
    },
    "CI": {
        "name": "Côte d'Ivoire",
        "flag": "🇨🇮",
        "currency": "XOF",
        "phone_prefix": "+225",
        "mobile_money": [
            {"code": "wave", "name": "Wave", "logo": "🌊", "color": "#1DA1F2", "min": 500, "max": 2000000, "fee_percent": 0},
            {"code": "orange_money", "name": "Orange Money", "logo": "🟠", "color": "#FF6600", "min": 500, "max": 1000000, "fee_percent": 0.5},
            {"code": "mtn_momo", "name": "MTN Mobile Money", "logo": "🟡", "color": "#FFCC00", "min": 500, "max": 1000000, "fee_percent": 0.5},
            {"code": "moov_money", "name": "Moov Money", "logo": "🔴", "color": "#E60012", "min": 500, "max": 500000, "fee_percent": 0.5}
        ],
        "telecom_operators": [
            {"code": "orange_ci", "name": "Orange Côte d'Ivoire", "logo": "🟠", "prefixes": ["07", "08"]},
            {"code": "mtn_ci", "name": "MTN Côte d'Ivoire", "logo": "🟡", "prefixes": ["05", "04"]},
            {"code": "moov_ci", "name": "Moov Africa", "logo": "🔴", "prefixes": ["01", "02"]}
        ]
    },
    "ML": {
        "name": "Mali",
        "flag": "🇲🇱",
        "currency": "XOF",
        "phone_prefix": "+223",
        "mobile_money": [
            {"code": "orange_money", "name": "Orange Money", "logo": "🟠", "color": "#FF6600", "min": 500, "max": 1000000, "fee_percent": 0.5},
            {"code": "moov_money", "name": "Moov Money", "logo": "🔴", "color": "#E60012", "min": 500, "max": 500000, "fee_percent": 0.5},
            {"code": "sama_money", "name": "Sama Money", "logo": "🟢", "color": "#00A650", "min": 500, "max": 500000, "fee_percent": 0.5}
        ],
        "telecom_operators": [
            {"code": "orange_ml", "name": "Orange Mali", "logo": "🟠", "prefixes": ["7", "9"]},
            {"code": "moov_ml", "name": "Moov Africa Mali", "logo": "🔴", "prefixes": ["6"]}
        ]
    },
    "BF": {
        "name": "Burkina Faso",
        "flag": "🇧🇫",
        "currency": "XOF",
        "phone_prefix": "+226",
        "mobile_money": [
            {"code": "orange_money", "name": "Orange Money", "logo": "🟠", "color": "#FF6600", "min": 500, "max": 1000000, "fee_percent": 0.5},
            {"code": "moov_money", "name": "Moov Money", "logo": "🔴", "color": "#E60012", "min": 500, "max": 500000, "fee_percent": 0.5},
            {"code": "coris_money", "name": "Coris Money", "logo": "🔵", "color": "#0066CC", "min": 500, "max": 500000, "fee_percent": 0.5}
        ],
        "telecom_operators": [
            {"code": "orange_bf", "name": "Orange Burkina", "logo": "🟠", "prefixes": ["07", "77"]},
            {"code": "moov_bf", "name": "Moov Africa Burkina", "logo": "🔴", "prefixes": ["70", "71"]}
        ]
    },
    "BJ": {
        "name": "Bénin",
        "flag": "🇧🇯",
        "currency": "XOF",
        "phone_prefix": "+229",
        "mobile_money": [
            {"code": "mtn_momo", "name": "MTN Mobile Money", "logo": "🟡", "color": "#FFCC00", "min": 500, "max": 1000000, "fee_percent": 0.5},
            {"code": "moov_money", "name": "Moov Money", "logo": "🔴", "color": "#E60012", "min": 500, "max": 500000, "fee_percent": 0.5},
            {"code": "celtiis_cash", "name": "Celtiis Cash", "logo": "🟢", "color": "#00A650", "min": 500, "max": 300000, "fee_percent": 0.5}
        ],
        "telecom_operators": [
            {"code": "mtn_bj", "name": "MTN Bénin", "logo": "🟡", "prefixes": ["96", "97"]},
            {"code": "moov_bj", "name": "Moov Africa Bénin", "logo": "🔴", "prefixes": ["94", "95"]}
        ]
    },
    "TG": {
        "name": "Togo",
        "flag": "🇹🇬",
        "currency": "XOF",
        "phone_prefix": "+228",
        "mobile_money": [
            {"code": "flooz", "name": "Flooz (Moov)", "logo": "🟢", "color": "#00A650", "min": 500, "max": 500000, "fee_percent": 0.5},
            {"code": "tmoney", "name": "T-Money (Togocom)", "logo": "🔵", "color": "#0066CC", "min": 500, "max": 500000, "fee_percent": 0.5}
        ],
        "telecom_operators": [
            {"code": "togocom", "name": "Togocom", "logo": "🔵", "prefixes": ["90", "91"]},
            {"code": "moov_tg", "name": "Moov Africa Togo", "logo": "🟢", "prefixes": ["92", "93"]}
        ]
    },
    "NE": {
        "name": "Niger",
        "flag": "🇳🇪",
        "currency": "XOF",
        "phone_prefix": "+227",
        "mobile_money": [
            {"code": "airtel_money", "name": "Airtel Money", "logo": "🔴", "color": "#E60012", "min": 500, "max": 500000, "fee_percent": 0.5},
            {"code": "orange_money", "name": "Orange Money", "logo": "🟠", "color": "#FF6600", "min": 500, "max": 500000, "fee_percent": 0.5},
            {"code": "moov_money", "name": "Moov Money", "logo": "🔴", "color": "#E60012", "min": 500, "max": 300000, "fee_percent": 0.5}
        ],
        "telecom_operators": [
            {"code": "airtel_ne", "name": "Airtel Niger", "logo": "🔴", "prefixes": ["96", "97"]},
            {"code": "orange_ne", "name": "Orange Niger", "logo": "🟠", "prefixes": ["90", "91"]},
            {"code": "moov_ne", "name": "Moov Africa Niger", "logo": "🔴", "prefixes": ["94"]}
        ]
    },
    "GW": {
        "name": "Guinée-Bissau",
        "flag": "🇬🇼",
        "currency": "XOF",
        "phone_prefix": "+245",
        "mobile_money": [
            {"code": "orange_money", "name": "Orange Money", "logo": "🟠", "color": "#FF6600", "min": 500, "max": 500000, "fee_percent": 0.5},
            {"code": "mtn_momo", "name": "MTN Mobile Money", "logo": "🟡", "color": "#FFCC00", "min": 500, "max": 500000, "fee_percent": 0.5}
        ],
        "telecom_operators": [
            {"code": "orange_gw", "name": "Orange Guinée-Bissau", "logo": "🟠", "prefixes": ["95", "96"]},
            {"code": "mtn_gw", "name": "MTN Guinée-Bissau", "logo": "🟡", "prefixes": ["97"]}
        ]
    },
    
    # Afrique de l'Ouest - Hors UEMOA
    "GN": {
        "name": "Guinée",
        "flag": "🇬🇳",
        "currency": "GNF",
        "phone_prefix": "+224",
        "mobile_money": [
            {"code": "orange_money", "name": "Orange Money", "logo": "🟠", "color": "#FF6600", "min": 5000, "max": 50000000, "fee_percent": 0.5},
            {"code": "mtn_momo", "name": "MTN Mobile Money", "logo": "🟡", "color": "#FFCC00", "min": 5000, "max": 50000000, "fee_percent": 0.5}
        ],
        "telecom_operators": [
            {"code": "orange_gn", "name": "Orange Guinée", "logo": "🟠", "prefixes": ["62", "65"]},
            {"code": "mtn_gn", "name": "MTN Guinée", "logo": "🟡", "prefixes": ["66", "67"]}
        ]
    },
    "GH": {
        "name": "Ghana",
        "flag": "🇬🇭",
        "currency": "GHS",
        "phone_prefix": "+233",
        "mobile_money": [
            {"code": "mtn_momo", "name": "MTN Mobile Money", "logo": "🟡", "color": "#FFCC00", "min": 1, "max": 100000, "fee_percent": 0},
            {"code": "vodafone_cash", "name": "Vodafone Cash", "logo": "🔴", "color": "#E60012", "min": 1, "max": 100000, "fee_percent": 0.5},
            {"code": "airteltigo", "name": "AirtelTigo Money", "logo": "🔵", "color": "#0066CC", "min": 1, "max": 50000, "fee_percent": 0.5},
            {"code": "g_money", "name": "G-Money", "logo": "🟢", "color": "#00A650", "min": 1, "max": 50000, "fee_percent": 0.5}
        ],
        "telecom_operators": [
            {"code": "mtn_gh", "name": "MTN Ghana", "logo": "🟡", "prefixes": ["24", "54", "55"]},
            {"code": "vodafone_gh", "name": "Vodafone Ghana", "logo": "🔴", "prefixes": ["20", "50"]},
            {"code": "airteltigo_gh", "name": "AirtelTigo Ghana", "logo": "🔵", "prefixes": ["26", "27", "57"]}
        ]
    },
    "NG": {
        "name": "Nigeria",
        "flag": "🇳🇬",
        "currency": "NGN",
        "phone_prefix": "+234",
        "mobile_money": [
            {"code": "opay", "name": "OPay", "logo": "🟢", "color": "#00A650", "min": 100, "max": 10000000, "fee_percent": 0},
            {"code": "palmpay", "name": "PalmPay", "logo": "🟣", "color": "#800080", "min": 100, "max": 10000000, "fee_percent": 0},
            {"code": "kuda", "name": "Kuda", "logo": "🟣", "color": "#40196D", "min": 100, "max": 10000000, "fee_percent": 0},
            {"code": "moniepoint", "name": "Moniepoint", "logo": "🔵", "color": "#0066CC", "min": 100, "max": 10000000, "fee_percent": 0},
            {"code": "paga", "name": "Paga", "logo": "🔵", "color": "#00BFFF", "min": 100, "max": 5000000, "fee_percent": 0.5}
        ],
        "telecom_operators": [
            {"code": "mtn_ng", "name": "MTN Nigeria", "logo": "🟡", "prefixes": ["803", "806", "703", "706"]},
            {"code": "airtel_ng", "name": "Airtel Nigeria", "logo": "🔴", "prefixes": ["802", "808", "701", "708"]},
            {"code": "glo_ng", "name": "Glo Nigeria", "logo": "🟢", "prefixes": ["805", "807", "705", "815"]},
            {"code": "9mobile", "name": "9mobile", "logo": "🟢", "prefixes": ["809", "817", "818", "909"]}
        ]
    },
    "LR": {
        "name": "Liberia",
        "flag": "🇱🇷",
        "currency": "LRD",
        "phone_prefix": "+231",
        "mobile_money": [
            {"code": "orange_money", "name": "Orange Money", "logo": "🟠", "color": "#FF6600", "min": 50, "max": 500000, "fee_percent": 0.5},
            {"code": "lonestar_momo", "name": "Lonestar MoMo", "logo": "🟡", "color": "#FFCC00", "min": 50, "max": 500000, "fee_percent": 0.5}
        ],
        "telecom_operators": [
            {"code": "orange_lr", "name": "Orange Liberia", "logo": "🟠", "prefixes": ["77", "88"]},
            {"code": "lonestar_lr", "name": "Lonestar MTN", "logo": "🟡", "prefixes": ["55", "66"]}
        ]
    },
    "SL": {
        "name": "Sierra Leone",
        "flag": "🇸🇱",
        "currency": "SLL",
        "phone_prefix": "+232",
        "mobile_money": [
            {"code": "orange_money", "name": "Orange Money", "logo": "🟠", "color": "#FF6600", "min": 1000, "max": 50000000, "fee_percent": 0.5},
            {"code": "afrimoney", "name": "Afrimoney", "logo": "🔵", "color": "#0066CC", "min": 1000, "max": 50000000, "fee_percent": 0.5}
        ],
        "telecom_operators": [
            {"code": "orange_sl", "name": "Orange Sierra Leone", "logo": "🟠", "prefixes": ["77", "78"]},
            {"code": "africell_sl", "name": "Africell", "logo": "🔵", "prefixes": ["30", "31"]}
        ]
    },

    # Afrique Centrale - Zone CEMAC (XAF)
    "CM": {
        "name": "Cameroun",
        "flag": "🇨🇲",
        "currency": "XAF",
        "phone_prefix": "+237",
        "mobile_money": [
            {"code": "orange_money", "name": "Orange Money", "logo": "🟠", "color": "#FF6600", "min": 500, "max": 1000000, "fee_percent": 0.5},
            {"code": "mtn_momo", "name": "MTN Mobile Money", "logo": "🟡", "color": "#FFCC00", "min": 500, "max": 1000000, "fee_percent": 0.5},
            {"code": "express_union", "name": "Express Union Mobile", "logo": "🔵", "color": "#0066CC", "min": 500, "max": 500000, "fee_percent": 0.5}
        ],
        "telecom_operators": [
            {"code": "mtn_cm", "name": "MTN Cameroun", "logo": "🟡", "prefixes": ["67", "68", "650"]},
            {"code": "orange_cm", "name": "Orange Cameroun", "logo": "🟠", "prefixes": ["69", "655", "656"]},
            {"code": "nexttel_cm", "name": "Nexttel", "logo": "🔵", "prefixes": ["66"]}
        ]
    },
    "GA": {
        "name": "Gabon",
        "flag": "🇬🇦",
        "currency": "XAF",
        "phone_prefix": "+241",
        "mobile_money": [
            {"code": "airtel_money", "name": "Airtel Money", "logo": "🔴", "color": "#E60012", "min": 500, "max": 1000000, "fee_percent": 0.5},
            {"code": "moov_money", "name": "Moov Money", "logo": "🔴", "color": "#E60012", "min": 500, "max": 500000, "fee_percent": 0.5}
        ],
        "telecom_operators": [
            {"code": "airtel_ga", "name": "Airtel Gabon", "logo": "🔴", "prefixes": ["74", "77"]},
            {"code": "moov_ga", "name": "Moov Africa Gabon", "logo": "🔴", "prefixes": ["62", "66"]}
        ]
    },
    "CG": {
        "name": "Congo-Brazzaville",
        "flag": "🇨🇬",
        "currency": "XAF",
        "phone_prefix": "+242",
        "mobile_money": [
            {"code": "airtel_money", "name": "Airtel Money", "logo": "🔴", "color": "#E60012", "min": 500, "max": 1000000, "fee_percent": 0.5},
            {"code": "mtn_momo", "name": "MTN Mobile Money", "logo": "🟡", "color": "#FFCC00", "min": 500, "max": 1000000, "fee_percent": 0.5}
        ],
        "telecom_operators": [
            {"code": "airtel_cg", "name": "Airtel Congo", "logo": "🔴", "prefixes": ["05", "04"]},
            {"code": "mtn_cg", "name": "MTN Congo", "logo": "🟡", "prefixes": ["06"]}
        ]
    },
    "CD": {
        "name": "RD Congo",
        "flag": "🇨🇩",
        "currency": "CDF",
        "phone_prefix": "+243",
        "mobile_money": [
            {"code": "mpesa", "name": "M-Pesa (Vodacom)", "logo": "🟢", "color": "#00A650", "min": 500, "max": 50000000, "fee_percent": 0.5},
            {"code": "orange_money", "name": "Orange Money", "logo": "🟠", "color": "#FF6600", "min": 500, "max": 50000000, "fee_percent": 0.5},
            {"code": "airtel_money", "name": "Airtel Money", "logo": "🔴", "color": "#E60012", "min": 500, "max": 50000000, "fee_percent": 0.5}
        ],
        "telecom_operators": [
            {"code": "vodacom_cd", "name": "Vodacom RDC", "logo": "🔴", "prefixes": ["81", "82"]},
            {"code": "airtel_cd", "name": "Airtel RDC", "logo": "🔴", "prefixes": ["99", "97"]},
            {"code": "orange_cd", "name": "Orange RDC", "logo": "🟠", "prefixes": ["84", "85"]}
        ]
    },

    # Afrique de l'Est
    "KE": {
        "name": "Kenya",
        "flag": "🇰🇪",
        "currency": "KES",
        "phone_prefix": "+254",
        "mobile_money": [
            {"code": "mpesa", "name": "M-Pesa", "logo": "🟢", "color": "#00A650", "min": 10, "max": 500000, "fee_percent": 0},
            {"code": "airtel_money", "name": "Airtel Money", "logo": "🔴", "color": "#E60012", "min": 10, "max": 300000, "fee_percent": 0.5},
            {"code": "t_kash", "name": "T-Kash (Telkom)", "logo": "🔵", "color": "#0066CC", "min": 10, "max": 300000, "fee_percent": 0.5}
        ],
        "telecom_operators": [
            {"code": "safaricom", "name": "Safaricom", "logo": "🟢", "prefixes": ["7", "1"]},
            {"code": "airtel_ke", "name": "Airtel Kenya", "logo": "🔴", "prefixes": ["73", "78"]},
            {"code": "telkom_ke", "name": "Telkom Kenya", "logo": "🔵", "prefixes": ["77"]}
        ]
    },
    "TZ": {
        "name": "Tanzanie",
        "flag": "🇹🇿",
        "currency": "TZS",
        "phone_prefix": "+255",
        "mobile_money": [
            {"code": "mpesa", "name": "M-Pesa (Vodacom)", "logo": "🟢", "color": "#00A650", "min": 1000, "max": 10000000, "fee_percent": 0.5},
            {"code": "tigopesa", "name": "Tigo Pesa", "logo": "🔵", "color": "#0066CC", "min": 1000, "max": 10000000, "fee_percent": 0.5},
            {"code": "airtel_money", "name": "Airtel Money", "logo": "🔴", "color": "#E60012", "min": 1000, "max": 10000000, "fee_percent": 0.5},
            {"code": "halopesa", "name": "HaloPesa", "logo": "🟣", "color": "#800080", "min": 1000, "max": 5000000, "fee_percent": 0.5}
        ],
        "telecom_operators": [
            {"code": "vodacom_tz", "name": "Vodacom Tanzania", "logo": "🔴", "prefixes": ["74", "75"]},
            {"code": "tigo_tz", "name": "Tigo Tanzania", "logo": "🔵", "prefixes": ["65", "71"]},
            {"code": "airtel_tz", "name": "Airtel Tanzania", "logo": "🔴", "prefixes": ["68", "69"]}
        ]
    },
    "UG": {
        "name": "Ouganda",
        "flag": "🇺🇬",
        "currency": "UGX",
        "phone_prefix": "+256",
        "mobile_money": [
            {"code": "mtn_momo", "name": "MTN Mobile Money", "logo": "🟡", "color": "#FFCC00", "min": 500, "max": 20000000, "fee_percent": 0.5},
            {"code": "airtel_money", "name": "Airtel Money", "logo": "🔴", "color": "#E60012", "min": 500, "max": 20000000, "fee_percent": 0.5}
        ],
        "telecom_operators": [
            {"code": "mtn_ug", "name": "MTN Uganda", "logo": "🟡", "prefixes": ["77", "78"]},
            {"code": "airtel_ug", "name": "Airtel Uganda", "logo": "🔴", "prefixes": ["70", "75"]}
        ]
    },
    "RW": {
        "name": "Rwanda",
        "flag": "🇷🇼",
        "currency": "RWF",
        "phone_prefix": "+250",
        "mobile_money": [
            {"code": "mtn_momo", "name": "MTN Mobile Money", "logo": "🟡", "color": "#FFCC00", "min": 100, "max": 5000000, "fee_percent": 0.5},
            {"code": "airtel_money", "name": "Airtel Money", "logo": "🔴", "color": "#E60012", "min": 100, "max": 5000000, "fee_percent": 0.5}
        ],
        "telecom_operators": [
            {"code": "mtn_rw", "name": "MTN Rwanda", "logo": "🟡", "prefixes": ["78", "79"]},
            {"code": "airtel_rw", "name": "Airtel Rwanda", "logo": "🔴", "prefixes": ["72", "73"]}
        ]
    },
    
    # Afrique Australe
    "ZM": {
        "name": "Zambie",
        "flag": "🇿🇲",
        "currency": "ZMW",
        "phone_prefix": "+260",
        "mobile_money": [
            {"code": "mtn_momo", "name": "MTN Mobile Money", "logo": "🟡", "color": "#FFCC00", "min": 1, "max": 50000, "fee_percent": 0.5},
            {"code": "airtel_money", "name": "Airtel Money", "logo": "🔴", "color": "#E60012", "min": 1, "max": 50000, "fee_percent": 0.5},
            {"code": "zamtel_kwacha", "name": "Zamtel Kwacha", "logo": "🟢", "color": "#00A650", "min": 1, "max": 50000, "fee_percent": 0.5}
        ],
        "telecom_operators": [
            {"code": "mtn_zm", "name": "MTN Zambia", "logo": "🟡", "prefixes": ["96", "97"]},
            {"code": "airtel_zm", "name": "Airtel Zambia", "logo": "🔴", "prefixes": ["95", "97"]},
            {"code": "zamtel", "name": "Zamtel", "logo": "🟢", "prefixes": ["95"]}
        ]
    },
    "ZW": {
        "name": "Zimbabwe",
        "flag": "🇿🇼",
        "currency": "ZWL",
        "phone_prefix": "+263",
        "mobile_money": [
            {"code": "ecocash", "name": "EcoCash", "logo": "🟢", "color": "#00A650", "min": 1, "max": 500000, "fee_percent": 0.5},
            {"code": "onemoney", "name": "OneMoney", "logo": "🔴", "color": "#E60012", "min": 1, "max": 500000, "fee_percent": 0.5}
        ],
        "telecom_operators": [
            {"code": "econet_zw", "name": "Econet", "logo": "🟢", "prefixes": ["77", "78"]},
            {"code": "netone_zw", "name": "NetOne", "logo": "🔴", "prefixes": ["71"]}
        ]
    },
    
    # Afrique du Nord
    "MA": {
        "name": "Maroc",
        "flag": "🇲🇦",
        "currency": "MAD",
        "phone_prefix": "+212",
        "mobile_money": [
            {"code": "inwi_money", "name": "Inwi Money", "logo": "🟣", "color": "#800080", "min": 10, "max": 50000, "fee_percent": 0.5},
            {"code": "orange_money", "name": "Orange Money", "logo": "🟠", "color": "#FF6600", "min": 10, "max": 50000, "fee_percent": 0.5}
        ],
        "telecom_operators": [
            {"code": "iam", "name": "Maroc Telecom", "logo": "🔵", "prefixes": ["6", "7"]},
            {"code": "orange_ma", "name": "Orange Maroc", "logo": "🟠", "prefixes": ["6", "7"]},
            {"code": "inwi", "name": "Inwi", "logo": "🟣", "prefixes": ["6", "7"]}
        ]
    },
    
    # Europe
    "FR": {
        "name": "France",
        "flag": "🇫🇷",
        "currency": "EUR",
        "phone_prefix": "+33",
        "mobile_money": [],  # No Mobile Money in France
        "telecom_operators": [
            {"code": "orange_fr", "name": "Orange France", "logo": "🟠", "prefixes": ["6", "7"]},
            {"code": "sfr", "name": "SFR", "logo": "🔴", "prefixes": ["6", "7"]},
            {"code": "bouygues", "name": "Bouygues Telecom", "logo": "🔵", "prefixes": ["6", "7"]},
            {"code": "free_fr", "name": "Free Mobile", "logo": "🔴", "prefixes": ["6", "7"]}
        ]
    }
}

# Quick amounts by currency
QUICK_AMOUNTS_BY_CURRENCY = {
    "XOF": [1000, 2000, 5000, 10000, 25000, 50000],
    "XAF": [1000, 2000, 5000, 10000, 25000, 50000],
    "EUR": [5, 10, 15, 20, 30, 50],
    "USD": [5, 10, 15, 20, 30, 50],
    "GHS": [10, 20, 50, 100, 200, 500],
    "NGN": [500, 1000, 2000, 5000, 10000, 20000],
    "KES": [100, 200, 500, 1000, 2000, 5000],
    "GNF": [10000, 25000, 50000, 100000, 200000, 500000],
    "CDF": [5000, 10000, 25000, 50000, 100000, 200000],
    "TZS": [5000, 10000, 20000, 50000, 100000, 200000],
    "UGX": [5000, 10000, 20000, 50000, 100000, 200000],
    "RWF": [500, 1000, 2000, 5000, 10000, 20000],
    "ZMW": [20, 50, 100, 200, 500, 1000],
    "MAD": [20, 50, 100, 200, 500, 1000]
}

def get_country_config(country_code: str):
    """Get configuration for a specific country"""
    return AFRICAN_COUNTRIES_CONFIG.get(country_code.upper())

def get_mobile_money_providers(country_code: str):
    """Get mobile money providers for a country"""
    config = AFRICAN_COUNTRIES_CONFIG.get(country_code.upper())
    return config.get("mobile_money", []) if config else []

def get_telecom_operators(country_code: str):
    """Get telecom operators for a country"""
    config = AFRICAN_COUNTRIES_CONFIG.get(country_code.upper())
    return config.get("telecom_operators", []) if config else []

def get_quick_amounts(currency: str):
    """Get quick amounts for a currency"""
    return QUICK_AMOUNTS_BY_CURRENCY.get(currency.upper(), QUICK_AMOUNTS_BY_CURRENCY.get("EUR"))
