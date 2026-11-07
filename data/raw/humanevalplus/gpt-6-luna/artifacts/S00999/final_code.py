from decimal import Decimal, InvalidOperation
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

    # Decimal parses decimal/scientific notation exactly; use its exact
    # integer ratio rather than converting through a binary float.
    try:
        numerator, denominator = Decimal(text).as_integer_ratio()
    except (InvalidOperation, ValueError):
        # Also allow exact rational spellings such as "3/2".
        numerator, denominator = Fraction(text).as_integer_ratio()

    magnitude = abs(numerator)
    whole, remainder = divmod(magnitude, denominator)
    if 2 * remainder >= denominator:
        whole += 1
    return -whole if numerator < 0 else whole
