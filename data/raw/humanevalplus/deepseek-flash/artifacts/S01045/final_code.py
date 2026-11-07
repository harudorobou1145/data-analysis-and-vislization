from decimal import Decimal
from fractions import Fraction
import re
import unicodedata


_SIGN_TRANSLATION = str.maketrans({
    "\u2212": "-",  # minus sign
    "\u2010": "-",  # hyphen
    "\u2011": "-",  # non-breaking hyphen
    "\u2012": "-",  # figure dash
    "\u2013": "-",  # en dash
    "\u2014": "-",  # em dash
    "\u2043": "-",  # hyphen bullet
    "\ufe63": "-",  # small hyphen-minus
    "\uff0d": "-",  # full-width hyphen-minus
    "\uff0b": "+",  # full-width plus
    "\u066b": ".",  # Arabic decimal separator
    "\uff0e": ".",  # full-width full stop
    "\u066c": ",",  # Arabic thousands separator
    "\uff0c": ",",  # full-width comma
    "\u2044": "/",  # fraction slash
    "\u2215": "/",  # division slash
    "\u00f7": "/",  # division sign
})

_GROUPING_APOSTROPHES = "'\u2018\u2019\u02bc"
_MIXED_FRACTION = re.compile(r"^([+-]?)(\d+)\s+(\d+)/(\d+)$")


def _normalise_number(value):
    """Return a conveniently normalised decimal or fractional string."""
    text = (value if isinstance(value, str) else str(value)).strip()

    # Accounting notation: (14.5) means -14.5.
    if len(text) >= 2 and text[0] == "(" and text[-1] == ")":
        text = text[1:-1].strip()
        if text[:1] in ("+", "-"):
            text = text[1:] if text[0] == "-" else "-" + text[1:]
        else:
            text = "-" + text

    text = text.translate(_SIGN_TRANSLATION)
    for symbol in "$€£¥₹₽₩":
        text = text.replace(symbol, "")
    text = text.replace("\u00a0", " ").replace("\u202f", " ")

    for apostrophe in _GROUPING_APOSTROPHES:
        text = text.replace(apostrophe, "")

    # Spaces can be thousands separators.  Do not remove the space in a
    # mixed fraction such as "14 1/2".
    if "/" not in text:
        text = re.sub(r"(?<=\d)\s+(?=\d)", "", text)

    text = re.sub(r"^([+-])\s+", r"\1", text.strip())

    # Split off an exponent before interpreting comma separators.
    exponent = ""
    position = max(text.find("e"), text.find("E"))
    if position != -1:
        exponent = text[position:]
        text = text[:position]

    if "," in text:
        if "." in text:
            if text.rfind(",") > text.rfind("."):
                # European style: 1.234,5
                text = text.replace(".", "").replace(",", ".")
            else:
                # English style: 1,234.5
                text = text.replace(",", "")
        else:
            parts = text.split(",")
            if len(parts) > 1 and all(len(part) == 3 for part in parts[1:]):
                text = "".join(parts)
            elif text.count(",") == 1:
                # Decimal-comma style: 14,5
                text = text.replace(",", ".")
            else:
                text = text.replace(",", "")

    return text + exponent


def _round_fraction_away_from_zero(number):
    numerator = number.numerator
    denominator = number.denominator
    sign = -1 if numerator < 0 else 1
    whole, remainder = divmod(abs(numerator), denominator)
    if remainder * 2 >= denominator:
        whole += 1
    return sign * whole


def _digits_to_int(digits):
    """Convert decimal digits without Python's string-to-int digit limit."""
    if not digits:
        return 0
    try:
        return int(digits)
    except ValueError:
        # int(Decimal(...)) is not subject to sys.set_int_max_str_digits().
        return int(Decimal(digits))


def _parse_exponent(text):
    """Return (sign, value) for an exponent, safely handling huge values."""
    sign = 1
    if text[:1] in ("+", "-"):
        if text[0] == "-":
            sign = -1
        text = text[1:]

    text = text.replace("_", "")
    if not text or not text.isdecimal():
        raise ValueError("invalid exponent")
    text = text.lstrip("0") or "0"

    if len(text) > 18:
        # An exponent this large is far beyond any practical input length.
        return sign, 10**18 + 1
    return sign, int(text)


def _shift_decimal_exponent(text, shift):
    """Divide a decimal string by a power of ten without converting it."""
    position = max(text.find("e"), text.find("E"))
    if position == -1:
        return "{}e{:+d}".format(text, shift)

    mantissa = text[:position]
    exponent_sign, exponent = _parse_exponent(text[position + 1:])
    return "{}e{:+d}".format(
        mantissa, exponent_sign * exponent + shift
    )


def _round_decimal_text(text):
    """Exactly round a plain decimal/scientific-notation string."""
    sign = 1
    if text[:1] in ("+", "-"):
        if text[0] == "-":
            sign = -1
        text = text[1:]

    exponent_text = None
    for marker in ("e", "E"):
        position = text.find(marker)
        if position != -1:
            if exponent_text is not None:
                raise ValueError("invalid exponent")
            exponent_text = text[position + 1:]
            text = text[:position]
            break

    if not text or text.count(".") > 1:
        raise ValueError("invalid number")

    text = text.replace("_", "")
    if "." in text:
        integer_part, fractional_part = text.split(".")
    else:
        integer_part, fractional_part = text, ""

    def ascii_digits(part):
        result = []
        for character in part:
            try:
                result.append(str(unicodedata.decimal(character)))
            except (TypeError, ValueError):
                raise ValueError("invalid digit")
        return "".join(result)

    before = ascii_digits(integer_part)
    after = ascii_digits(fractional_part)
    if not before and not after:
        raise ValueError("invalid number")

    digits = before + after
    first_nonzero = next((i for i, digit in enumerate(digits) if digit != "0"), None)
    if first_nonzero is None:
        return 0

    if exponent_text is None:
        exponent_sign, exponent = 1, 0
    else:
        exponent_sign, exponent = _parse_exponent(exponent_text)

    significant = digits[first_nonzero:]
    point_position = len(before) + exponent_sign * exponent - first_nonzero

    if point_position <= 0:
        if point_position < 0:
            return 0
        # The first significant digit is in the tenths position.
        rounded = 1 if significant[0] >= "5" else 0
        return sign * rounded

    if point_position >= len(significant):
        coefficient = _digits_to_int(significant)
        return sign * coefficient * (10 ** (point_position - len(significant)))

    integer = _digits_to_int(significant[:point_position])
    if significant[point_position] >= "5":
        integer += 1
    return sign * integer


def _round_base_number(text, divisor=1):
    """Round a base-prefixed integer or base fraction exactly."""
    sign = 1
    if text[:1] in ("+", "-"):
        if text[0] == "-":
            sign = -1
        text = text[1:]

    if len(text) < 3 or text[0] != "0" or text[1].lower() not in "box":
        raise ValueError("not a base-prefixed number")

    base = {"b": 2, "o": 8, "x": 16}[text[1].lower()]
    body = text[2:].replace("_", "")
    if not body or body.count(".") > 1:
        raise ValueError("invalid base number")

    if "." in body:
        whole_part, fractional_part = body.split(".")
    else:
        whole_part, fractional_part = body, ""

    if not whole_part and not fractional_part:
        raise ValueError("invalid base number")

    try:
        whole = int(whole_part or "0", base)
        fraction = int(fractional_part or "0", base)
    except ValueError as error:
        raise ValueError("invalid base number") from error

    denominator = base ** len(fractional_part)
    numerator = whole * denominator + fraction
    return _round_fraction_away_from_zero(
        Fraction(sign * numerator, denominator * divisor)
    )


def _round_fraction_text(text, divisor=1):
    mixed = _MIXED_FRACTION.match(text)
    if mixed:
        sign = -1 if mixed.group(1) == "-" else 1
        whole = int(mixed.group(2))
        numerator = int(mixed.group(3))
        denominator = int(mixed.group(4))
        if denominator == 0:
            raise ZeroDivisionError
        value = Fraction(sign * (whole * denominator + numerator), denominator)
        return _round_fraction_away_from_zero(value / divisor)

    return _round_fraction_away_from_zero(Fraction(text) / divisor)


def closest_integer(value):
    '''
    Create a function that takes a value (string) representing a number
    and returns the closest integer to it. If the number is equidistant
    from two integers, round it away from zero.

    Examples
    >>> closest_integer("10")
    10
    >>> closest_integer("15.3")
    15

    Note:
    Rounding away from zero means that if the given number is equidistant
    from two integers, the one you should return is the one that is the
    farthest from zero. For example closest_integer("14.5") should
    return 15 and closest_integer("-14.5") should return -15.
    '''
    try:
        text = _normalise_number(value)

        divisor = 1
        for symbol, scale in (("\u2030", 1000), ("%", 100)):
            if text.endswith(symbol):
                text = text[:-1].strip()
                divisor = scale
                break

        unsigned = text[1:] if text[:1] in ("+", "-") else text
        is_base_number = (
            len(unsigned) >= 2
            and unsigned[0] == "0"
            and unsigned[1].lower() in "box"
        )
        if is_base_number:
            return _round_base_number(text, divisor)

        # Accept a few unambiguous source-language number spellings.
        text = re.sub(r"(?<=\d)[dD](?=[+-]?\d)", "e", text)
        if len(text) > 1 and text[-1] in "fFdD" and (
            text[-2].isdigit() or text[-2] == "."
        ):
            text = text[:-1]

        if "/" in text:
            return _round_fraction_text(text, divisor)

        if divisor != 1:
            text = _shift_decimal_exponent(text, -2 if divisor == 100 else -3)
        return _round_decimal_text(text)
    except (ArithmeticError, TypeError, ValueError, ZeroDivisionError) as error:
        raise ValueError("invalid number: {!r}".format(value)) from error
