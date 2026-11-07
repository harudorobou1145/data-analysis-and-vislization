import math


def poly(xs: list, x: float):
    """
    Evaluates polynomial with coefficients xs at point x.
    return xs[0] + xs[1] * x + xs[1] * x^2 + .... xs[n] * x^n
    """
    return sum([coeff * math.pow(x, i) for i, coeff in enumerate(xs)])


def find_zero(xs: list):
    """ xs are coefficients of a polynomial.
    find_zero find x such that poly(x) = 0.
    find_zero returns only only zero point, even if there are many.
    Moreover, find_zero only takes list xs having even number of coefficients
    and largest non zero coefficient as it guarantees
    a solution.
    >>> round(find_zero([1, 2]), 2) # f(x) = 1 + 2x
    -0.5
    >>> round(find_zero([-6, 11, -6, 1]), 2) # (x - 1) * (x - 2) * (x - 3) = -6 + 11x - 6x^2 + x^3
    1.0
    """
    def evaluate(x):
        value = 0.0
        for coefficient in reversed(xs):
            value = value * x + coefficient
        return value

    if xs[0] == 0:
        return 0.0

    # An odd-degree polynomial has opposite signs sufficiently far apart.
    left, right = -1.0, 1.0
    f_left, f_right = evaluate(left), evaluate(right)
    while (f_left < 0) == (f_right < 0):
        if f_left == 0:
            return left
        if f_right == 0:
            return right
        left *= 2
        right *= 2
        f_left, f_right = evaluate(left), evaluate(right)

    if f_left == 0:
        return left
    if f_right == 0:
        return right

    while True:
        middle = left / 2 + right / 2
        if middle == left or middle == right:
            return left if abs(f_left) < abs(f_right) else right
        f_middle = evaluate(middle)
        if f_middle == 0:
            return middle
        if (f_middle < 0) == (f_left < 0):
            left, f_left = middle, f_middle
        else:
            right, f_right = middle, f_middle
