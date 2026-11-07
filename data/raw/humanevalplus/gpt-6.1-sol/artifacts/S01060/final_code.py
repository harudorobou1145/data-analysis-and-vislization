def truncate_number(number: float) -> float:
    """Given a positive floating point number, return its decimal part.

    >>> truncate_number(3.5)
    0.5
    """
    return number - int(number)
