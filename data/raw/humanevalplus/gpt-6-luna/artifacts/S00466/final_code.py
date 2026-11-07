def truncate_number(number: float) -> float:
    """Return the decimal part of a positive floating-point number.

    The decimal part is the amount left over after removing the integer part.

    >>> truncate_number(3.5)
    0.5
    """
    return number % 1
