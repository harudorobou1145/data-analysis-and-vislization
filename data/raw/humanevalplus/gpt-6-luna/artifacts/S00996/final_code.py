from decimal import Decimal, ROUND_HALF_UP


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
    # Decimal avoids the binary floating-point errors that can move values
    # just above or below a half-integer. ROUND_HALF_UP breaks exact ties
    # away from zero for both positive and negative numbers.
    number = Decimal(str(value))
    rounded = number.to_integral_value(rounding=ROUND_HALF_UP)
    return int(rounded)
