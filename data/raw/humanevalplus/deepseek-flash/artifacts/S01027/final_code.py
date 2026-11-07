from operator import index


def string_sequence(n: int) -> str:
    """ Return a string containing space-delimited numbers starting from 0 upto n inclusive.
    >>> string_sequence(0)
    '0'
    >>> string_sequence(5)
    '0 1 2 3 4 5'
    """
    # Normalize integer-like and numeric inputs first.  In particular, doing
    # arithmetic directly on values such as NumPy uint types can produce an
    # incompatible type (or even overflow).
    try:
        limit = index(n)
    except TypeError as original_error:
        try:
            limit = int(n)
        except (TypeError, ValueError, OverflowError):
            raise TypeError("n must be an integer") from original_error

    return " ".join(map(str, range(limit + 1)))
