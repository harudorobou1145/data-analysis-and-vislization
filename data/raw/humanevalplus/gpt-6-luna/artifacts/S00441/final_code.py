def prime_length(string):
    """Return whether the length of ``string`` is a prime number.

    Examples:
        prime_length('Hello') == True
        prime_length('abcdcba') == True
        prime_length('kittens') == True
        prime_length('orange') == False
    """
    length = len(string)
    if length < 2:
        return False
    if length % 2 == 0:
        return length == 2

    divisor = 3
    while divisor * divisor <= length:
        if length % divisor == 0:
            return False
        divisor += 2
    return True
