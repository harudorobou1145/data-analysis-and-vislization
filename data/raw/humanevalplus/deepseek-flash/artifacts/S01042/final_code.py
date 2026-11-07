from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from fractions import Fraction


def _normalise_number(value):
    """Return a Decimal/Fraction-compatible representation of *value*."""
    text = (value if isinstance(value, str) else str(value)).strip()

    # Decimal accepts ASCII signs, but mathematical text often uses these.
    text = text.translate(str.maketrans({
        "\u2212": "-",  # minus sign
        "\u2012": "-",  # figure dash
        "\u2013": "-",  # en dash
        "\u2014": "-",  # em dash
        "\ufe63": "-",  # small hyphen-minus
        "\uff0d": "-",  # full-width hyphen-minus
        "\uff0b": "+",  # full-width plus
    }))

    # Normalise common decimal/thousands-separator notation.  Scientific
    # notation is split off first so an 'e' in the exponent is untouched.
    exponent = ""
    lower = text.lower()
    for marker in ("e",):
        position = lower.find(marker)
        if position != -1:
            exponent = text[position:]
            text = text[:position]
            break

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
    text = _normalise_number(value)

    try:
        if "/" in text:
            return _round_fraction_away_from_zero(Fraction(text))

        number = Decimal(text)
        if not number.is_finite():
            raise ValueError("the value must be finite")
        return int(number.to_integral_value(rounding=ROUND_HALF_UP))
    except (InvalidOperation, ValueError, ZeroDivisionError) as error:
        raise ValueError("invalid number: {!r}".format(value)) from error
