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
    # Accept byte strings as well as text strings while keeping parsing
    # decimal-based and exact (rather than introducing binary float error).
    if isinstance(value, bytes):
        value = value.decode('ascii')
    number = Decimal(str(value))
    return int(number.to_integral_value(rounding=ROUND_HALF_UP))
