from io import StringIO
from operator import index


def string_sequence(n: int) -> str:
    """ Return a string containing space-delimited numbers starting from 0 upto n inclusive.
    >>> string_sequence(0)
    '0'
    >>> string_sequence(5)
    '0 1 2 3 4 5'
    """
    limit = index(n)

    # Building into StringIO avoids creating one temporary string object per
    # number.  This keeps memory usage proportional to the returned string,
    # which matters for large values of n.
    result = StringIO()
    for number in range(limit + 1):
        if number:
            result.write(" ")
        result.write(str(number))

    return result.getvalue()
