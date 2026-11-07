from math import isfinite


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
    if not isinstance(value, str):
        raise TypeError("value must be a string")

    try:
        number = float(value.strip())
    except ValueError as error:
        raise ValueError("invalid number: {!r}".format(value)) from error

    if not isfinite(number):
        raise ValueError("value must be a finite number: {!r}".format(value))

    if number < 0:
        return int(number - 0.5)
    return int(number + 0.5)
