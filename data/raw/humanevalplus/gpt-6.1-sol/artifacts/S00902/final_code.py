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
    left, right = -1.0, 1.0
    left_value, right_value = poly(xs, left), poly(xs, right)

    # An odd-degree polynomial eventually has opposite signs at the endpoints.
    while True:
        if left_value == 0:
            return left
        if right_value == 0:
            return right
        if (left_value < 0) != (right_value < 0):
            break
        left *= 2.0
        right *= 2.0
        left_value, right_value = poly(xs, left), poly(xs, right)

    while True:
        middle = left / 2.0 + right / 2.0
        # Stop when there is no representable midpoint between the endpoints.
        if middle == left or middle == right:
            return left if abs(left_value) <= abs(right_value) else right
        middle_value = poly(xs, middle)
        if middle_value == 0:
            return middle
        if (middle_value < 0) == (left_value < 0):
            left, left_value = middle, middle_value
        else:
            right, right_value = middle, middle_value
