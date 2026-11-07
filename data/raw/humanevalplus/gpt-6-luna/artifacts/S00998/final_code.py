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
    # Parse the textual value as an exact rational so that neither a binary
    # float nor a decimal context can affect which side of a half it lies on.
    if isinstance(value, bytes):
        value = value.decode('ascii')
    number = Fraction(str(value))

    magnitude = abs(number.numerator)
    denominator = number.denominator
    whole, remainder = divmod(magnitude, denominator)
    if 2 * remainder >= denominator:
        whole += 1
    return -whole if number.numerator < 0 else whole
