def string_sequence(n: int) -> str:
    """ Return a string containing space-delimited numbers starting from 0 upto n inclusive.
    >>> string_sequence(0)
    '0'
    >>> string_sequence(5)
    '0 1 2 3 4 5'
    """
    if n < 0:
        return ""

    # Normalize before adding one so integer subclasses cannot change the
    # arithmetic used to construct the range.
    upper_bound = int(n)
    return " ".join([str(number) for number in range(upper_bound + 1)])
