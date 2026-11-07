from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from fractions import Fraction


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
    if isinstance(value, bytes):
        value = value.decode('ascii')
    text = str(value)

    # Decimal provides exact decimal/scientific parsing and rounds without
    # expanding very small exponents into enormous rational denominators.
    try:
        number = Decimal(text)
        return int(number.to_integral_value(rounding=ROUND_HALF_UP))
    except InvalidOperation:
        # Also accept rational spellings (for example, "3/2").
        number = Fraction(text)
        magnitude = abs(number.numerator)
        whole, remainder = divmod(magnitude, number.denominator)
        if 2 * remainder >= number.denominator:
            whole += 1
        return -whole if number.numerator < 0 else whole
