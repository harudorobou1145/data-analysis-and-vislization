
def prime_length(string):
    """Return True when the length of *string* is a prime number."""
    length = len(string)
    if length < 2:
        return False
    if length == 2:
        return True
    if length % 2 == 0:
        return False

    divisor = 3
    while divisor * divisor <= length:
        if length % divisor == 0:
            return False
        divisor += 2
    return True
